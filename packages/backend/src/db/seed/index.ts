/**
 * OpsWeave — Database Seeder
 *
 * Creates a demo tenant with sample users, groups, and tickets
 * for development and evaluation purposes.
 *
 * Usage: npx tsx src/db/seed/index.ts
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { initDatabase, getDb, type TypedDb } from '../../config/database.js';
// AUDIT-FIX: H-11 — Structured logging
import logger from '../../lib/logger.js';
import {
  tenants,
  users,
  tenantUserMemberships,
  assigneeGroups,
  userGroupMemberships,
  tickets,
  ticketCategories,
  ticketComments,
  ticketHistory,
  customers,
  customerPortalUsers,
  assets,
  assetRelations,
  assetTypes,
  relationTypes,
  classificationModels,
  classificationValues,
  capacityTypes,
  workflowTemplates,
  workflowSteps,
  workflowInstances,
  workflowStepInstances,
  kbArticles,
  kbArticleLinks,
  regulatoryFrameworks,
  regulatoryRequirements,
  requirementServiceMappings,
  serviceDescriptions,
  horizontalCatalog,
  horizontalCatalogItems,
  verticalCatalogs,
  verticalCatalogOverrides,
  assetServiceLinks,
  slaDefinitions,
  slaAssignments,
  projects,
  projectAssets,
  complianceControls,
  requirementControlMappings,
  complianceAudits,
  auditFindings,
  complianceEvidence,
  frameworkRequirementMappings,
  assetRegulatoryFlags,
  assetClassifications,
  assetCapacities,
  serviceProfiles,
  serviceEntitlements,
  escalationRules,
  monitoringSources,
  knownErrors,
  serviceScopeItems,
} from '../schema/index.js';
import { DEMO_LICENSE_KEY } from './demo-license.js';

const now = new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const BCRYPT_ROUNDS = 12;

/**
 * Core seeding logic. Exported for use by server auto-setup.
 * Assumes DB is already initialized via initDatabase().
 */
export async function runSeed(): Promise<void> {
  await doSeed();
}

async function doSeed(): Promise<void> {
  const db = getDb() as TypedDb;

  // ─── Tenant ─────────────────────────────────────────────
  const tenantId = uuidv4();
  await db.insert(tenants).values({
    id: tenantId,
    name: 'Demo Organisation',
    slug: 'demo-org',
    settings: '{}',
    license_key: DEMO_LICENSE_KEY,
    is_active: 1,
    created_at: now,
    updated_at: now,
  });
  logger.info('  ✓ Tenant: Demo Organisation (Enterprise license applied)');

  // ─── System User (for automated actions: SLA breach, escalation, etc.) ──
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
  await db.insert(users).values({
    id: SYSTEM_USER_ID,
    email: 'system@opsweave.internal',
    display_name: 'System',
    password_hash: null,
    auth_provider: 'local' as const,
    external_id: null,
    language: 'de' as const,
    is_active: 0,
    is_superadmin: 0,
    last_login: null,
    created_at: now,
  }).onConflictDoNothing();
  logger.info('  ✓ System user for automated actions');

  // ─── Users ──────────────────────────────────────────────
  const adminId = uuidv4();
  const agentId = uuidv4();
  const managerId = uuidv4();
  const viewerId = uuidv4();

  const adminHash = await bcrypt.hash('changeme', BCRYPT_ROUNDS);
  const defaultHash = await bcrypt.hash('password123', BCRYPT_ROUNDS);

  const userRows = [
    {
      id: adminId,
      email: 'admin@opsweave.local',
      display_name: 'Admin User',
      password_hash: adminHash,
      auth_provider: 'local' as const,
      external_id: null,
      language: 'de' as const,
      is_active: 1,
      is_superadmin: 1,
      last_login: null,
      created_at: now,
    },
    {
      id: managerId,
      email: 'manager@opsweave.local',
      display_name: 'Maria Manager',
      password_hash: defaultHash,
      auth_provider: 'local' as const,
      external_id: null,
      language: 'de' as const,
      is_active: 1,
      is_superadmin: 0,
      last_login: null,
      created_at: now,
    },
    {
      id: agentId,
      email: 'agent@opsweave.local',
      display_name: 'Alex Agent',
      password_hash: defaultHash,
      auth_provider: 'local' as const,
      external_id: null,
      language: 'de' as const,
      is_active: 1,
      is_superadmin: 0,
      last_login: null,
      created_at: now,
    },
    {
      id: viewerId,
      email: 'viewer@opsweave.local',
      display_name: 'Vera Viewer',
      password_hash: defaultHash,
      auth_provider: 'local' as const,
      external_id: null,
      language: 'en' as const,
      is_active: 1,
      is_superadmin: 0,
      last_login: null,
      created_at: now,
    },
  ];
  await db.insert(users).values(userRows);
  logger.info('  ✓ Users: admin, manager, agent, viewer');

  // ─── Tenant Memberships ─────────────────────────────────
  await db.insert(tenantUserMemberships).values([
    { tenant_id: tenantId, user_id: adminId, role: 'admin', is_default: 1 },
    { tenant_id: tenantId, user_id: managerId, role: 'manager', is_default: 1 },
    { tenant_id: tenantId, user_id: agentId, role: 'agent', is_default: 1 },
    { tenant_id: tenantId, user_id: viewerId, role: 'viewer', is_default: 1 },
  ]);
  logger.info('  ✓ Tenant memberships assigned');

  // ─── Groups ─────────────────────────────────────────────
  const supportGroupId = uuidv4();
  const opsGroupId = uuidv4();
  const devGroupId = uuidv4();

  await db.insert(assigneeGroups).values([
    {
      id: supportGroupId,
      tenant_id: tenantId,
      name: '1st Level Support',
      description: 'Erster Ansprechpartner für alle Incidents',
      group_type: 'support',
      parent_group_id: null,
      created_at: now,
    },
    {
      id: opsGroupId,
      tenant_id: tenantId,
      name: 'Operations',
      description: 'Infrastruktur und Betrieb',
      group_type: 'operations',
      parent_group_id: null,
      created_at: now,
    },
    {
      id: devGroupId,
      tenant_id: tenantId,
      name: 'Development',
      description: 'Anwendungsentwicklung und Bugfixes',
      group_type: 'development',
      parent_group_id: null,
      created_at: now,
    },
  ]);
  logger.info('  ✓ Groups: 1st Level Support, Operations, Development');

  // ─── Group Memberships ──────────────────────────────────
  await db.insert(userGroupMemberships).values([
    { user_id: agentId, group_id: supportGroupId, tenant_id: tenantId, role_in_group: 'member' },
    { user_id: managerId, group_id: supportGroupId, tenant_id: tenantId, role_in_group: 'lead' },
    { user_id: agentId, group_id: opsGroupId, tenant_id: tenantId, role_in_group: 'member' },
    { user_id: managerId, group_id: devGroupId, tenant_id: tenantId, role_in_group: 'lead' },
  ]);
  logger.info('  ✓ Group memberships assigned');

  // ─── Customers ────────────────────────────────────────────
  const customerAcmeId = uuidv4();
  const customerTechCorpId = uuidv4();
  const customerMedTechId = uuidv4();

  await db.insert(customers).values([
    {
      id: customerAcmeId,
      tenant_id: tenantId,
      name: 'Acme GmbH',
      industry: 'Produktion',
      contact_email: 'it@acme-gmbh.de',
      is_active: 1,
      created_at: now,
    },
    {
      id: customerTechCorpId,
      tenant_id: tenantId,
      name: 'TechCorp AG',
      industry: 'Technologie',
      contact_email: 'support@techcorp.de',
      is_active: 1,
      created_at: now,
    },
    {
      id: customerMedTechId,
      tenant_id: tenantId,
      name: 'MedTech Solutions',
      industry: 'Gesundheitswesen',
      contact_email: 'helpdesk@medtech-solutions.de',
      is_active: 1,
      created_at: now,
    },
  ]);
  logger.info('  ✓ Customers: Acme GmbH, TechCorp AG, MedTech Solutions');

  // ─── Customer Portal Users ────────────────────────────────
  // Separate user table — not the same as internal users.
  // Portal users see only tickets belonging to their customer within the tenant.

  const portalUserHash = await bcrypt.hash('changeme', BCRYPT_ROUNDS);

  // AUDIT-FIX: M-07 — Use proper UUID instead of hardcoded placeholder
  await db.insert(customerPortalUsers).values({
    id: uuidv4(),
    tenant_id: tenantId,
    customer_id: customerAcmeId,
    email: 'portal@acme.example.com',
    display_name: 'Acme Portal User',
    password_hash: portalUserHash,
    is_active: 1,
    last_login: null,
    created_at: now,
  });
  logger.info('  ✓ Customer Portal User: portal@acme.example.com (Acme GmbH)');

  // ─── Categories ──────────────────────────────────────────
  const catNetzwerkId = uuidv4();
  const catServerId = uuidv4();
  const catApplikationId = uuidv4();
  const catDatenbankId = uuidv4();
  const catSecurityId = uuidv4();
  const catArbeitsplatzId = uuidv4();
  const catSonstigesId = uuidv4();

  await db.insert(ticketCategories).values([
    { id: catNetzwerkId, tenant_id: tenantId, name: 'Netzwerk', applies_to: 'all', is_active: 1, created_at: now },
    { id: catServerId, tenant_id: tenantId, name: 'Server', applies_to: 'all', is_active: 1, created_at: now },
    { id: catApplikationId, tenant_id: tenantId, name: 'Applikation', applies_to: 'all', is_active: 1, created_at: now },
    { id: catDatenbankId, tenant_id: tenantId, name: 'Datenbank', applies_to: 'all', is_active: 1, created_at: now },
    { id: catSecurityId, tenant_id: tenantId, name: 'Security', applies_to: 'all', is_active: 1, created_at: now },
    { id: catArbeitsplatzId, tenant_id: tenantId, name: 'Arbeitsplatz', applies_to: 'all', is_active: 1, created_at: now },
    { id: catSonstigesId, tenant_id: tenantId, name: 'Sonstiges', applies_to: 'all', is_active: 1, created_at: now },
  ]);
  logger.info('  ✓ Categories: Netzwerk, Server, Applikation, Datenbank, Security, Arbeitsplatz, Sonstiges');

  // ─── Asset Type Registry (Evo-1A) ─────────────────────
  const systemAssetTypes: Array<{ slug: string; name: string; category: string; attribute_schema?: string }> = [
    // Compute
    { slug: 'server_physical', name: 'Physical Server', category: 'compute', attribute_schema: JSON.stringify([
      { key: 'cpu_cores', label: { de: 'CPU-Kerne', en: 'CPU Cores' }, type: 'number', required: false, sort_order: 0 },
      { key: 'ram_gb', label: { de: 'RAM (GB)', en: 'RAM (GB)' }, type: 'number', required: false, sort_order: 1 },
      { key: 'vendor', label: { de: 'Hersteller', en: 'Vendor' }, type: 'text', required: false, sort_order: 2 },
      { key: 'model', label: { de: 'Modell', en: 'Model' }, type: 'text', required: false, sort_order: 3 },
      { key: 'serial_number', label: { de: 'Seriennummer', en: 'Serial Number' }, type: 'text', required: false, sort_order: 4 },
    ]) },
    { slug: 'server_virtual', name: 'Virtual Machine', category: 'compute', attribute_schema: JSON.stringify([
      { key: 'cpu_cores', label: { de: 'vCPUs', en: 'vCPUs' }, type: 'number', required: false, sort_order: 0 },
      { key: 'ram_gb', label: { de: 'RAM (GB)', en: 'RAM (GB)' }, type: 'number', required: false, sort_order: 1 },
      { key: 'os', label: { de: 'Betriebssystem', en: 'Operating System' }, type: 'text', required: false, sort_order: 2 },
    ]) },
    { slug: 'virtualization_host', name: 'Virtualization Host', category: 'compute' },
    { slug: 'container', name: 'Container', category: 'compute' },
    { slug: 'container_host', name: 'Container Host', category: 'compute' },
    // Network
    { slug: 'network_switch', name: 'Switch', category: 'network' },
    { slug: 'network_router', name: 'Router', category: 'network' },
    { slug: 'network_firewall', name: 'Firewall', category: 'network' },
    { slug: 'network_load_balancer', name: 'Load Balancer', category: 'network' },
    { slug: 'network_wap', name: 'Wireless Access Point', category: 'network' },
    // Storage
    { slug: 'storage_san', name: 'SAN Storage', category: 'storage' },
    { slug: 'storage_nas', name: 'NAS Storage', category: 'storage' },
    { slug: 'storage_backup', name: 'Backup System', category: 'storage' },
    // Infrastructure
    { slug: 'rack', name: 'Rack', category: 'infrastructure' },
    { slug: 'pdu', name: 'Power Distribution Unit', category: 'infrastructure' },
    { slug: 'ups', name: 'UPS', category: 'infrastructure' },
    // Software
    { slug: 'database', name: 'Database', category: 'software', attribute_schema: JSON.stringify([
      { key: 'dbms_type', label: { de: 'DBMS-Typ', en: 'DBMS Type' }, type: 'select', required: false, sort_order: 0, options: [
        { value: 'postgresql', label: { de: 'PostgreSQL', en: 'PostgreSQL' } },
        { value: 'mysql', label: { de: 'MySQL', en: 'MySQL' } },
        { value: 'mariadb', label: { de: 'MariaDB', en: 'MariaDB' } },
        { value: 'oracle', label: { de: 'Oracle', en: 'Oracle' } },
        { value: 'mssql', label: { de: 'Microsoft SQL Server', en: 'Microsoft SQL Server' } },
        { value: 'mongodb', label: { de: 'MongoDB', en: 'MongoDB' } },
        { value: 'redis', label: { de: 'Redis', en: 'Redis' } },
        { value: 'elasticsearch', label: { de: 'Elasticsearch', en: 'Elasticsearch' } },
        { value: 'other', label: { de: 'Sonstiges', en: 'Other' } },
      ] },
      { key: 'version', label: { de: 'Version', en: 'Version' }, type: 'text', required: false, sort_order: 1 },
      { key: 'instance_name', label: { de: 'Instanzname', en: 'Instance Name' }, type: 'text', required: false, sort_order: 2 },
      { key: 'port', label: { de: 'Port', en: 'Port' }, type: 'number', required: false, sort_order: 3 },
      { key: 'storage_engine', label: { de: 'Storage Engine', en: 'Storage Engine' }, type: 'text', required: false, sort_order: 4 },
      { key: 'charset', label: { de: 'Zeichensatz', en: 'Character Set' }, type: 'text', required: false, sort_order: 5 },
      { key: 'max_connections', label: { de: 'Max. Verbindungen', en: 'Max Connections' }, type: 'number', required: false, sort_order: 6 },
      { key: 'backup_schedule', label: { de: 'Backup-Zeitplan', en: 'Backup Schedule' }, type: 'text', required: false, sort_order: 7 },
      { key: 'replication_role', label: { de: 'Replikationsrolle', en: 'Replication Role' }, type: 'select', required: false, sort_order: 8, options: [
        { value: 'primary', label: { de: 'Primär', en: 'Primary' } },
        { value: 'replica', label: { de: 'Replikat', en: 'Replica' } },
        { value: 'standalone', label: { de: 'Standalone', en: 'Standalone' } },
      ] },
    ]) },
    { slug: 'database_instance', name: 'Database Instance', category: 'software', attribute_schema: JSON.stringify([
      { key: 'dbms_type', label: { de: 'DBMS-Typ', en: 'DBMS Type' }, type: 'select', required: false, sort_order: 0, options: [
        { value: 'postgresql', label: { de: 'PostgreSQL', en: 'PostgreSQL' } },
        { value: 'mysql', label: { de: 'MySQL', en: 'MySQL' } },
        { value: 'mariadb', label: { de: 'MariaDB', en: 'MariaDB' } },
        { value: 'oracle', label: { de: 'Oracle', en: 'Oracle' } },
        { value: 'mssql', label: { de: 'Microsoft SQL Server', en: 'Microsoft SQL Server' } },
        { value: 'mongodb', label: { de: 'MongoDB', en: 'MongoDB' } },
        { value: 'redis', label: { de: 'Redis', en: 'Redis' } },
        { value: 'elasticsearch', label: { de: 'Elasticsearch', en: 'Elasticsearch' } },
        { value: 'other', label: { de: 'Sonstiges', en: 'Other' } },
      ] },
      { key: 'version', label: { de: 'Version', en: 'Version' }, type: 'text', required: false, sort_order: 1 },
      { key: 'instance_name', label: { de: 'Instanzname', en: 'Instance Name' }, type: 'text', required: false, sort_order: 2 },
      { key: 'port', label: { de: 'Port', en: 'Port' }, type: 'number', required: false, sort_order: 3 },
      { key: 'storage_engine', label: { de: 'Storage Engine', en: 'Storage Engine' }, type: 'text', required: false, sort_order: 4 },
      { key: 'charset', label: { de: 'Zeichensatz', en: 'Character Set' }, type: 'text', required: false, sort_order: 5 },
      { key: 'max_connections', label: { de: 'Max. Verbindungen', en: 'Max Connections' }, type: 'number', required: false, sort_order: 6 },
      { key: 'backup_schedule', label: { de: 'Backup-Zeitplan', en: 'Backup Schedule' }, type: 'text', required: false, sort_order: 7 },
      { key: 'replication_role', label: { de: 'Replikationsrolle', en: 'Replication Role' }, type: 'select', required: false, sort_order: 8, options: [
        { value: 'primary', label: { de: 'Primär', en: 'Primary' } },
        { value: 'replica', label: { de: 'Replikat', en: 'Replica' } },
        { value: 'standalone', label: { de: 'Standalone', en: 'Standalone' } },
      ] },
    ]) },
    { slug: 'application', name: 'Application', category: 'software', attribute_schema: JSON.stringify([
      { key: 'vendor', label: { de: 'Hersteller', en: 'Vendor' }, type: 'text', required: false, sort_order: 0 },
      { key: 'version', label: { de: 'Version', en: 'Version' }, type: 'text', required: false, sort_order: 1 },
      { key: 'technology_stack', label: { de: 'Technologie-Stack', en: 'Technology Stack' }, type: 'text', required: false, sort_order: 2 },
      { key: 'deployment_type', label: { de: 'Deployment-Typ', en: 'Deployment Type' }, type: 'select', required: false, sort_order: 3, options: [
        { value: 'on-premise', label: { de: 'On-Premise', en: 'On-Premise' } },
        { value: 'cloud', label: { de: 'Cloud', en: 'Cloud' } },
        { value: 'hybrid', label: { de: 'Hybrid', en: 'Hybrid' } },
        { value: 'saas', label: { de: 'SaaS', en: 'SaaS' } },
      ] },
      { key: 'url', label: { de: 'URL', en: 'URL' }, type: 'url', required: false, sort_order: 4 },
      { key: 'port', label: { de: 'Port', en: 'Port' }, type: 'number', required: false, sort_order: 5 },
      { key: 'authentication_type', label: { de: 'Authentifizierungstyp', en: 'Authentication Type' }, type: 'select', required: false, sort_order: 6, options: [
        { value: 'local', label: { de: 'Lokal', en: 'Local' } },
        { value: 'ldap', label: { de: 'LDAP', en: 'LDAP' } },
        { value: 'oidc', label: { de: 'OIDC', en: 'OIDC' } },
        { value: 'saml', label: { de: 'SAML', en: 'SAML' } },
        { value: 'none', label: { de: 'Keine', en: 'None' } },
      ] },
      { key: 'business_owner', label: { de: 'Fachverantwortlicher', en: 'Business Owner' }, type: 'text', required: false, sort_order: 7 },
      { key: 'data_classification', label: { de: 'Datenklassifizierung', en: 'Data Classification' }, type: 'select', required: false, sort_order: 8, options: [
        { value: 'public', label: { de: 'Öffentlich', en: 'Public' } },
        { value: 'internal', label: { de: 'Intern', en: 'Internal' } },
        { value: 'confidential', label: { de: 'Vertraulich', en: 'Confidential' } },
        { value: 'restricted', label: { de: 'Eingeschränkt', en: 'Restricted' } },
      ] },
    ]) },
    { slug: 'service', name: 'Service', category: 'software' },
    { slug: 'middleware', name: 'Middleware', category: 'software' },
    { slug: 'cluster', name: 'Cluster', category: 'software' },
    // End User
    { slug: 'workstation', name: 'Workstation', category: 'enduser' },
    { slug: 'laptop', name: 'Laptop', category: 'enduser' },
    { slug: 'printer', name: 'Printer', category: 'enduser' },
    // Security (Evo-1B)
    { slug: 'ip_address', name: 'IP Address', category: 'security', attribute_schema: JSON.stringify([
      { key: 'address', label: { de: 'Adresse', en: 'Address' }, type: 'ip_address', required: true, sort_order: 0 },
      { key: 'subnet', label: { de: 'Subnetz', en: 'Subnet' }, type: 'text', required: false, sort_order: 1 },
      { key: 'vlan', label: { de: 'VLAN', en: 'VLAN' }, type: 'number', required: false, sort_order: 2 },
      { key: 'allocation_status', label: { de: 'Zuweisungsstatus', en: 'Allocation Status' }, type: 'select', required: false, sort_order: 3, options: [
        { value: 'allocated', label: { de: 'Zugewiesen', en: 'Allocated' } },
        { value: 'available', label: { de: 'Verfügbar', en: 'Available' } },
        { value: 'reserved', label: { de: 'Reserviert', en: 'Reserved' } },
      ] },
      { key: 'reverse_dns', label: { de: 'Reverse DNS', en: 'Reverse DNS' }, type: 'text', required: false, sort_order: 4 },
    ]) },
    { slug: 'domain', name: 'Domain', category: 'security', attribute_schema: JSON.stringify([
      { key: 'fqdn', label: { de: 'FQDN', en: 'FQDN' }, type: 'text', required: true, sort_order: 0 },
      { key: 'registrar', label: { de: 'Registrar', en: 'Registrar' }, type: 'text', required: false, sort_order: 1 },
      { key: 'dns_provider', label: { de: 'DNS-Anbieter', en: 'DNS Provider' }, type: 'text', required: false, sort_order: 2 },
      { key: 'expiry_date', label: { de: 'Ablaufdatum', en: 'Expiry Date' }, type: 'date', required: false, sort_order: 3 },
      { key: 'ssl_enabled', label: { de: 'SSL aktiv', en: 'SSL Enabled' }, type: 'boolean', required: false, sort_order: 4 },
    ]) },
    { slug: 'certificate', name: 'Certificate', category: 'security', attribute_schema: JSON.stringify([
      { key: 'issuer', label: { de: 'Aussteller', en: 'Issuer' }, type: 'text', required: false, sort_order: 0 },
      { key: 'subject', label: { de: 'Subjekt', en: 'Subject' }, type: 'text', required: false, sort_order: 1 },
      { key: 'valid_from', label: { de: 'Gültig ab', en: 'Valid From' }, type: 'date', required: false, sort_order: 2 },
      { key: 'valid_until', label: { de: 'Gültig bis', en: 'Valid Until' }, type: 'date', required: false, sort_order: 3 },
      { key: 'key_algorithm', label: { de: 'Schlüsselalgorithmus', en: 'Key Algorithm' }, type: 'text', required: false, sort_order: 4 },
      { key: 'san_entries', label: { de: 'SAN-Einträge', en: 'SAN Entries' }, type: 'text', required: false, sort_order: 5 },
    ]) },
    { slug: 'port', name: 'Port', category: 'security', attribute_schema: JSON.stringify([
      { key: 'protocol', label: { de: 'Protokoll', en: 'Protocol' }, type: 'select', required: false, sort_order: 0, options: [
        { value: 'tcp', label: { de: 'TCP', en: 'TCP' } },
        { value: 'udp', label: { de: 'UDP', en: 'UDP' } },
      ] },
      { key: 'port_number', label: { de: 'Portnummer', en: 'Port Number' }, type: 'number', required: true, sort_order: 1 },
      { key: 'state', label: { de: 'Status', en: 'State' }, type: 'select', required: false, sort_order: 2, options: [
        { value: 'open', label: { de: 'Offen', en: 'Open' } },
        { value: 'closed', label: { de: 'Geschlossen', en: 'Closed' } },
        { value: 'filtered', label: { de: 'Gefiltert', en: 'Filtered' } },
      ] },
    ]) },
    { slug: 'service_endpoint', name: 'Service Endpoint', category: 'security', attribute_schema: JSON.stringify([
      { key: 'url', label: { de: 'URL', en: 'URL' }, type: 'url', required: true, sort_order: 0 },
      { key: 'protocol', label: { de: 'Protokoll', en: 'Protocol' }, type: 'text', required: false, sort_order: 1 },
      { key: 'auth_type', label: { de: 'Auth-Typ', en: 'Auth Type' }, type: 'text', required: false, sort_order: 2 },
    ]) },
    { slug: 'software', name: 'Software', category: 'software', attribute_schema: JSON.stringify([
      { key: 'vendor', label: { de: 'Hersteller', en: 'Vendor' }, type: 'text', required: true, sort_order: 0 },
      { key: 'product_name', label: { de: 'Produktname', en: 'Product Name' }, type: 'text', required: true, sort_order: 1 },
      { key: 'version', label: { de: 'Version', en: 'Version' }, type: 'text', required: false, sort_order: 2 },
      { key: 'edition', label: { de: 'Edition', en: 'Edition' }, type: 'text', required: false, sort_order: 3 },
      { key: 'license_type', label: { de: 'Lizenztyp', en: 'License Type' }, type: 'select', required: false, sort_order: 4, options: [
        { value: 'per-seat', label: { de: 'Pro Benutzer', en: 'Per Seat' } },
        { value: 'per-core', label: { de: 'Pro Kern', en: 'Per Core' } },
        { value: 'subscription', label: { de: 'Abonnement', en: 'Subscription' } },
        { value: 'open-source', label: { de: 'Open Source', en: 'Open Source' } },
        { value: 'freeware', label: { de: 'Freeware', en: 'Freeware' } },
        { value: 'site-license', label: { de: 'Standortlizenz', en: 'Site License' } },
      ] },
      { key: 'license_count', label: { de: 'Lizenzanzahl', en: 'License Count' }, type: 'number', required: false, sort_order: 5 },
      { key: 'license_expiry', label: { de: 'Lizenz-Ablaufdatum', en: 'License Expiry' }, type: 'date', required: false, sort_order: 6 },
      { key: 'support_status', label: { de: 'Supportstatus', en: 'Support Status' }, type: 'select', required: false, sort_order: 7, options: [
        { value: 'active', label: { de: 'Aktiv', en: 'Active' } },
        { value: 'eol', label: { de: 'End of Life', en: 'End of Life' } },
        { value: 'eosl', label: { de: 'End of Service Life', en: 'End of Service Life' } },
        { value: 'unknown', label: { de: 'Unbekannt', en: 'Unknown' } },
      ] },
      { key: 'eol_date', label: { de: 'End-of-Life-Datum', en: 'End of Life Date' }, type: 'date', required: false, sort_order: 8 },
      { key: 'eosl_date', label: { de: 'End-of-Service-Life-Datum', en: 'End of Service Life Date' }, type: 'date', required: false, sort_order: 9 },
      { key: 'cve_reference_url', label: { de: 'CVE-Referenz-URL', en: 'CVE Reference URL' }, type: 'url', required: false, sort_order: 10 },
      { key: 'install_path', label: { de: 'Installationspfad', en: 'Install Path' }, type: 'text', required: false, sort_order: 11 },
    ]) },
    // Other
    { slug: 'other', name: 'Other', category: 'other' },
  ];

  const assetTypeInserts = systemAssetTypes.map((at) => ({
    id: uuidv4(),
    tenant_id: tenantId,
    slug: at.slug,
    name: at.name,
    category: at.category,
    is_system: 1,
    is_active: 1,
    attribute_schema: at.attribute_schema ?? '[]',
    created_at: now,
    updated_at: now,
  }));

  await db.insert(assetTypes).values(assetTypeInserts);
  logger.info(`  ✓ Asset Types: ${systemAssetTypes.length} system types registered`);

  // ─── Relation Type Registry (Evo-3A) ──────────────────
  // REQ-3.2a: Relation types with properties_schema definitions
  const runsOnSchema = JSON.stringify([
    { key: 'cpu_cores', label: { de: 'CPU-Kerne', en: 'CPU Cores' }, type: 'number', required: false, sort_order: 0 },
    { key: 'ram_gb', label: { de: 'RAM (GB)', en: 'RAM (GB)' }, type: 'number', required: false, sort_order: 1 },
    { key: 'storage_gb', label: { de: 'Speicher (GB)', en: 'Storage (GB)' }, type: 'number', required: false, sort_order: 2 },
  ]);
  const connectedToSchema = JSON.stringify([
    { key: 'bandwidth_mbps', label: { de: 'Bandbreite (Mbps)', en: 'Bandwidth (Mbps)' }, type: 'number', required: false, sort_order: 0 },
    { key: 'latency_ms', label: { de: 'Latenz (ms)', en: 'Latency (ms)' }, type: 'number', required: false, sort_order: 1 },
    { key: 'vlan', label: { de: 'VLAN', en: 'VLAN' }, type: 'number', required: false, sort_order: 2 },
  ]);
  const dependsOnSchema = JSON.stringify([
    { key: 'dependency_type', label: { de: 'Abhängigkeitstyp', en: 'Dependency Type' }, type: 'select', required: false, options: [{ value: 'hard', label: { de: 'Hart', en: 'Hard' } }, { value: 'soft', label: { de: 'Weich', en: 'Soft' } }], sort_order: 0 },
    { key: 'priority', label: { de: 'Priorität', en: 'Priority' }, type: 'select', required: false, options: [{ value: 'critical', label: { de: 'Kritisch', en: 'Critical' } }, { value: 'high', label: { de: 'Hoch', en: 'High' } }, { value: 'medium', label: { de: 'Mittel', en: 'Medium' } }, { value: 'low', label: { de: 'Niedrig', en: 'Low' } }], sort_order: 1 },
  ]);
  const backupOfSchema = JSON.stringify([
    { key: 'schedule', label: { de: 'Zeitplan', en: 'Schedule' }, type: 'text', required: false, sort_order: 0 },
    { key: 'retention_days', label: { de: 'Aufbewahrung (Tage)', en: 'Retention (Days)' }, type: 'number', required: false, sort_order: 1 },
    { key: 'backup_type', label: { de: 'Backup-Typ', en: 'Backup Type' }, type: 'select', required: false, options: [{ value: 'full', label: { de: 'Vollständig', en: 'Full' } }, { value: 'incremental', label: { de: 'Inkrementell', en: 'Incremental' } }, { value: 'differential', label: { de: 'Differenziell', en: 'Differential' } }], sort_order: 2 },
  ]);

  const relTypeSchemaLookup: Record<string, string> = {
    runs_on: runsOnSchema,
    connected_to: connectedToSchema,
    depends_on: dependsOnSchema,
    backup_of: backupOfSchema,
  };

  const systemRelationTypes = [
    { slug: 'runs_on', name: 'Runs on', category: 'dependency' },
    { slug: 'connected_to', name: 'Connected to', category: 'network' },
    { slug: 'stored_on', name: 'Stored on', category: 'storage' },
    { slug: 'powered_by', name: 'Powered by', category: 'infrastructure' },
    { slug: 'member_of', name: 'Member of', category: 'grouping' },
    { slug: 'depends_on', name: 'Depends on', category: 'dependency' },
    { slug: 'backup_of', name: 'Backup of', category: 'storage' },
    { slug: 'exposes', name: 'Exposes', category: 'network' },
    { slug: 'protects', name: 'Protects', category: 'security' },
    { slug: 'backs_up', name: 'Backs up', category: 'storage' },
    { slug: 'monitored_by', name: 'Monitored by', category: 'monitoring' },
    { slug: 'serves', name: 'Serves', category: 'service' },
    { slug: 'governed_by', name: 'Governed by', category: 'compliance' },
    { slug: 'licensed_to', name: 'Licensed to', category: 'licensing' },
    { slug: 'encrypts', name: 'Encrypts', category: 'security' },
  ];

  const relationTypeInserts = systemRelationTypes.map((rt) => ({
    id: uuidv4(),
    tenant_id: tenantId,
    slug: rt.slug,
    name: rt.name,
    category: rt.category,
    is_directional: 1,
    source_types: '[]',
    target_types: '[]',
    properties_schema: relTypeSchemaLookup[rt.slug] ?? '[]',
    is_system: 1,
    is_active: 1,
    created_at: now,
  }));

  await db.insert(relationTypes).values(relationTypeInserts);
  logger.info(`  ✓ Relation Types: ${systemRelationTypes.length} system types registered`);

  // ─── Assets (CMDB) ─────────────────────────────────────
  const assetRackId = uuidv4();
  const assetEsxi01Id = uuidv4();
  const assetEsxi02Id = uuidv4();
  const assetWeb01Id = uuidv4();
  const assetWeb02Id = uuidv4();
  const assetDb01Id = uuidv4();
  const assetMysqlId = uuidv4();
  const assetFwId = uuidv4();
  const assetSwId = uuidv4();
  const assetLbId = uuidv4();
  const assetNasId = uuidv4();
  const assetOpsweaveId = uuidv4();
  const assetMonitoringId = uuidv4();
  const assetDevVmId = uuidv4();

  await db.insert(assets).values([
    {
      id: assetRackId,
      tenant_id: tenantId,
      asset_type: 'rack',
      name: 'dc-rack-01',
      display_name: 'DC Rack 01 — Hauptrack',
      status: 'active',
      location: 'RZ Frankfurt, Raum A2, Reihe 3',
      sla_tier: 'none',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetEsxi01Id,
      tenant_id: tenantId,
      asset_type: 'virtualization_host',
      name: 'esxi-host-01',
      display_name: 'ESXi Host 01',
      status: 'active',
      ip_address: '10.0.1.10',
      location: 'RZ Frankfurt, Rack 01, HE 38-40',
      sla_tier: 'gold',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{"cpu_cores": 64, "ram_gb": 512, "vendor": "Dell PowerEdge R750"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetEsxi02Id,
      tenant_id: tenantId,
      asset_type: 'virtualization_host',
      name: 'esxi-host-02',
      display_name: 'ESXi Host 02',
      status: 'active',
      ip_address: '10.0.1.11',
      location: 'RZ Frankfurt, Rack 01, HE 35-37',
      sla_tier: 'gold',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{"cpu_cores": 64, "ram_gb": 512, "vendor": "Dell PowerEdge R750"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetWeb01Id,
      tenant_id: tenantId,
      asset_type: 'server_virtual',
      name: 'app-web-01',
      display_name: 'Webserver 01',
      status: 'active',
      ip_address: '10.0.2.10',
      location: 'ESXi Host 01',
      sla_tier: 'gold',
      environment: 'production',
      owner_group_id: devGroupId,
      customer_id: customerAcmeId,
      attributes: '{"vcpu": 4, "ram_gb": 16, "os": "Ubuntu 22.04 LTS"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetWeb02Id,
      tenant_id: tenantId,
      asset_type: 'server_virtual',
      name: 'app-web-02',
      display_name: 'Webserver 02',
      status: 'active',
      ip_address: '10.0.2.11',
      location: 'ESXi Host 02',
      sla_tier: 'gold',
      environment: 'production',
      owner_group_id: devGroupId,
      customer_id: customerAcmeId,
      attributes: '{"vcpu": 4, "ram_gb": 16, "os": "Ubuntu 22.04 LTS"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetDb01Id,
      tenant_id: tenantId,
      asset_type: 'server_virtual',
      name: 'app-db-01',
      display_name: 'Datenbankserver 01',
      status: 'active',
      ip_address: '10.0.3.10',
      location: 'ESXi Host 01',
      sla_tier: 'platinum',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{"vcpu": 8, "ram_gb": 64, "os": "Ubuntu 22.04 LTS"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetMysqlId,
      tenant_id: tenantId,
      asset_type: 'database',
      name: 'db-mysql-prod',
      display_name: 'MySQL Production',
      status: 'active',
      location: 'app-db-01',
      sla_tier: 'platinum',
      environment: 'production',
      owner_group_id: devGroupId,
      attributes: '{"engine": "MySQL 8.0", "size_gb": 250, "replication": "primary-replica"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetFwId,
      tenant_id: tenantId,
      asset_type: 'network_firewall',
      name: 'fw-edge-01',
      display_name: 'Edge Firewall 01',
      status: 'active',
      ip_address: '10.0.0.1',
      location: 'RZ Frankfurt, Rack 01, HE 1',
      sla_tier: 'gold',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{"vendor": "Fortinet FortiGate 200F", "firmware": "7.4.3"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetSwId,
      tenant_id: tenantId,
      asset_type: 'network_switch',
      name: 'sw-core-01',
      display_name: 'Core Switch 01',
      status: 'active',
      ip_address: '10.0.0.10',
      location: 'RZ Frankfurt, Rack 01, HE 2-3',
      sla_tier: 'gold',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{"vendor": "Cisco Catalyst 9300", "ports": 48}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetLbId,
      tenant_id: tenantId,
      asset_type: 'network_load_balancer',
      name: 'lb-frontend',
      display_name: 'Frontend Load Balancer',
      status: 'active',
      ip_address: '10.0.0.20',
      location: 'RZ Frankfurt, Rack 01, HE 4',
      sla_tier: 'silver',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{"vendor": "HAProxy", "type": "virtual appliance"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetNasId,
      tenant_id: tenantId,
      asset_type: 'storage_nas',
      name: 'nas-backup-01',
      display_name: 'Backup NAS 01',
      status: 'active',
      ip_address: '10.0.5.120',
      location: 'RZ Frankfurt, Rack 02, HE 10-14',
      sla_tier: 'bronze',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{"vendor": "Synology RS3621xs+", "capacity_tb": 96, "raid": "RAID 6"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetOpsweaveId,
      tenant_id: tenantId,
      asset_type: 'application',
      name: 'app-opsweave',
      display_name: 'OpsWeave ITSM',
      status: 'active',
      location: 'Webserver 01/02',
      sla_tier: 'silver',
      environment: 'production',
      owner_group_id: devGroupId,
      attributes: '{"version": "1.0.0", "framework": "React + Express"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetMonitoringId,
      tenant_id: tenantId,
      asset_type: 'application',
      name: 'app-monitoring',
      display_name: 'Checkmk Monitoring',
      status: 'active',
      ip_address: '10.0.6.10',
      location: 'ESXi Host 02',
      sla_tier: 'silver',
      environment: 'production',
      owner_group_id: opsGroupId,
      attributes: '{"version": "2.2.0", "edition": "Enterprise"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
    {
      id: assetDevVmId,
      tenant_id: tenantId,
      asset_type: 'server_virtual',
      name: 'dev-vm-01',
      display_name: 'Entwicklungs-VM 01',
      status: 'active',
      ip_address: '10.1.0.10',
      location: 'ESXi Host 02',
      sla_tier: 'none',
      environment: 'development',
      owner_group_id: devGroupId,
      attributes: '{"vcpu": 2, "ram_gb": 8, "os": "Ubuntu 24.04 LTS"}',
      created_at: now,
      updated_at: now,
      created_by: adminId,
    },
  ]);
  logger.info('  ✓ Assets: 14 CMDB assets (rack, VMs, firewall, switch, etc.)');

  // ─── Asset Relations (REQ-3.2a: with structured properties) ───
  await db.insert(assetRelations).values([
    // VMs run on ESXi hosts — with resource allocation properties
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetWeb01Id, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 4, ram_gb: 16, storage_gb: 200 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetWeb02Id, target_asset_id: assetEsxi02Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 4, ram_gb: 16, storage_gb: 200 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetDb01Id, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 8, ram_gb: 32, storage_gb: 500 }), created_at: now, created_by: adminId },
    // MySQL runs on DB server
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetMysqlId, target_asset_id: assetDb01Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 4, ram_gb: 16, storage_gb: 100 }), created_at: now, created_by: adminId },
    // OpsWeave depends on MySQL + Webserver — with dependency metadata
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetOpsweaveId, target_asset_id: assetMysqlId, relation_type: 'depends_on', properties: JSON.stringify({ dependency_type: 'hard', priority: 'critical' }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetOpsweaveId, target_asset_id: assetWeb01Id, relation_type: 'depends_on', properties: JSON.stringify({ dependency_type: 'hard', priority: 'high' }), created_at: now, created_by: adminId },
    // Hardware in rack
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetEsxi01Id, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetEsxi02Id, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetSwId, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    // Network connections — with bandwidth/VLAN properties
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetFwId, target_asset_id: assetSwId, relation_type: 'connected_to', properties: JSON.stringify({ bandwidth_mbps: 10000, latency_ms: 0.5, vlan: 100 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetLbId, target_asset_id: assetSwId, relation_type: 'connected_to', properties: JSON.stringify({ bandwidth_mbps: 10000, latency_ms: 0.3, vlan: 200 }), created_at: now, created_by: adminId },
    // Backup relation — with schedule properties
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetNasId, target_asset_id: assetMysqlId, relation_type: 'backup_of', properties: JSON.stringify({ schedule: '0 2 * * *', retention_days: 30, backup_type: 'incremental' }), created_at: now, created_by: adminId },
  ]);
  logger.info('  ✓ Asset Relations: 12 relations (runs_on, depends_on, member_of, connected_to, backup_of)');

  // ─── Tickets ────────────────────────────────────────────
  const majorIncidentId = uuidv4();
  const sampleTickets = [
    {
      id: majorIncidentId,
      tenant_id: tenantId,
      ticket_number: 'INC-2026-00001',
      ticket_type: 'incident' as const,
      subtype: null,
      title: 'E-Mail-Server nicht erreichbar',
      description: 'Der Exchange-Server antwortet seit 08:15 nicht mehr auf Anfragen. Betroffen sind ca. 200 Mitarbeiter.',
      status: 'open' as const,
      priority: 'critical' as const,
      impact: 'high' as const,
      urgency: 'critical' as const,
      asset_id: null,
      assignee_id: agentId,
      assignee_group_id: supportGroupId,
      reporter_id: managerId,
      customer_id: customerAcmeId,
      category_id: catNetzwerkId,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'gold',
      sla_response_due: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      sla_resolve_due: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
      sla_breached: 0,
      parent_ticket_id: null,
      source: 'manual' as const,
      created_at: now,
      updated_at: now,
      resolved_at: null,
      closed_at: null,
      created_by: managerId,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_number: 'INC-2026-00002',
      ticket_type: 'incident' as const,
      subtype: null,
      title: 'VPN-Verbindung bricht regelmäßig ab',
      description: 'Mehrere Remote-Mitarbeiter berichten, dass die VPN-Verbindung alle 15-20 Minuten abbricht.',
      status: 'in_progress' as const,
      priority: 'high' as const,
      impact: 'medium' as const,
      urgency: 'high' as const,
      asset_id: assetFwId,
      assignee_id: agentId,
      assignee_group_id: opsGroupId,
      reporter_id: adminId,
      customer_id: customerTechCorpId,
      category_id: catNetzwerkId,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'silver',
      sla_response_due: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      sla_resolve_due: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
      sla_breached: 0,
      parent_ticket_id: null,
      source: 'manual' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      updated_at: now,
      resolved_at: null,
      closed_at: null,
      created_by: adminId,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_number: 'CHG-2026-00001',
      ticket_type: 'change' as const,
      subtype: 'standard',
      title: 'Firewall-Regel für neuen Webserver hinzufügen',
      description: 'Port 443 und 80 für den neuen Webserver web-srv-03 (10.0.1.50) freischalten.',
      status: 'pending' as const,
      priority: 'medium' as const,
      impact: 'low' as const,
      urgency: 'medium' as const,
      asset_id: assetFwId,
      assignee_id: null,
      assignee_group_id: opsGroupId,
      reporter_id: managerId,
      customer_id: null,
      category_id: catApplikationId,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: null,
      sla_response_due: null,
      sla_resolve_due: null,
      sla_breached: 0,
      parent_ticket_id: null,
      source: 'manual' as const,
      change_risk_level: 'low',
      change_risk_likelihood: 'unlikely',
      change_risk_impact: 'low',
      change_planned_start: new Date(Date.now() + 3 * 86400000).toISOString(),
      change_planned_end: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString(),
      change_implementation: 'iptables-Regel auf fw-edge-01 hinzufügen, Ports 80+443 für 10.0.1.50',
      change_rollback_plan: 'Regel entfernen: iptables -D INPUT ...',
      cab_required: 0,
      cab_decision: null,
      cab_decision_by: null,
      cab_decision_at: null,
      cab_notes: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      updated_at: now,
      resolved_at: null,
      closed_at: null,
      created_by: managerId,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_number: 'PRB-2026-00001',
      ticket_type: 'problem' as const,
      subtype: null,
      title: 'Wiederkehrende Speicherprobleme auf DB-Cluster',
      description: 'Der Datenbank-Cluster zeigt seit 3 Wochen wiederholt hohe Speicherauslastung. Root Cause Analyse nötig.',
      status: 'open' as const,
      priority: 'high' as const,
      impact: 'high' as const,
      urgency: 'medium' as const,
      asset_id: assetMysqlId,
      assignee_id: managerId,
      assignee_group_id: devGroupId,
      reporter_id: agentId,
      customer_id: customerMedTechId,
      category_id: catDatenbankId,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'gold',
      sla_response_due: null,
      sla_resolve_due: null,
      sla_breached: 0,
      parent_ticket_id: null,
      source: 'manual' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      updated_at: now,
      resolved_at: null,
      closed_at: null,
      created_by: agentId,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_number: 'INC-2026-00003',
      ticket_type: 'incident' as const,
      subtype: null,
      title: 'Drucker im 3. OG druckt nicht mehr',
      description: 'Der Netzwerkdrucker HP LaserJet im 3. OG (Raum 305) reagiert nicht. Display zeigt "Bereit".',
      status: 'resolved' as const,
      priority: 'low' as const,
      impact: 'low' as const,
      urgency: 'low' as const,
      asset_id: null,
      assignee_id: agentId,
      assignee_group_id: supportGroupId,
      reporter_id: viewerId,
      customer_id: customerAcmeId,
      category_id: catArbeitsplatzId,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'bronze',
      sla_response_due: null,
      sla_resolve_due: null,
      sla_breached: 0,
      parent_ticket_id: null,
      source: 'portal' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      closed_at: null,
      created_by: viewerId,
    },
    // Child incident linked to major incident INC-2026-00001
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_number: 'INC-2026-00004',
      ticket_type: 'incident' as const,
      subtype: null,
      title: 'DNS-Auflösung für Exchange fehlgeschlagen',
      description: 'Der DNS-Record für den Exchange-Server zeigt auf eine falsche IP-Adresse. Vermutliche Ursache des E-Mail-Ausfalls.',
      status: 'in_progress' as const,
      priority: 'critical' as const,
      impact: 'high' as const,
      urgency: 'critical' as const,
      asset_id: null,
      assignee_id: agentId,
      assignee_group_id: opsGroupId,
      reporter_id: agentId,
      customer_id: null,
      category_id: catNetzwerkId,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'gold',
      sla_response_due: new Date(Date.now() + 1000 * 60 * 20).toISOString(),
      sla_resolve_due: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
      sla_breached: 0,
      parent_ticket_id: majorIncidentId,
      source: 'manual' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      updated_at: now,
      resolved_at: null,
      closed_at: null,
      created_by: agentId,
    },
  ];

  await db.insert(tickets).values(sampleTickets);
  logger.info('  ✓ Tickets: 6 sample tickets (4 incidents [1 child], 1 change, 1 problem)');

  // ─── Comments ───────────────────────────────────────────
  const ticketId1 = sampleTickets[0]!.id;
  await db.insert(ticketComments).values([
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_id: ticketId1,
      author_id: agentId,
      content: 'Exchange-Server wird untersucht. Erste Diagnose: DNS-Auflösung fehlerhaft.',
      is_internal: 1,
      source: 'agent',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_id: ticketId1,
      author_id: managerId,
      content: 'Bitte um Status-Update. CEO fragt nach.',
      is_internal: 0,
      source: 'agent',
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ]);
  logger.info('  ✓ Comments: 2 sample comments');

  // ─── History ────────────────────────────────────────────
  await db.insert(ticketHistory).values([
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_id: ticketId1,
      field_changed: 'status',
      old_value: null,
      new_value: 'open',
      changed_by: managerId,
      changed_at: now,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      ticket_id: sampleTickets[1]!.id,
      field_changed: 'status',
      old_value: 'open',
      new_value: 'in_progress',
      changed_by: agentId,
      changed_at: now,
    },
  ]);
  logger.info('  ✓ History: 2 sample history entries');

  // ─── Workflow Templates ──────────────────────────────────
  const wfTemplate1Id = uuidv4();
  const wfTemplate2Id = uuidv4();

  await db.insert(workflowTemplates).values([
    {
      id: wfTemplate1Id,
      tenant_id: tenantId,
      name: 'Incident-Eskalation',
      description: 'Standardprozess für die Eskalation kritischer Incidents',
      trigger_type: 'ticket_created',
      trigger_subtype: 'incident',
      is_active: 1,
      version: 1,
      created_by: adminId,
      created_at: now,
      updated_at: now,
    },
    {
      id: wfTemplate2Id,
      tenant_id: tenantId,
      name: 'Change-Genehmigung',
      description: 'CAB-Genehmigungsprozess für Change Requests',
      trigger_type: 'ticket_created',
      trigger_subtype: 'change',
      is_active: 1,
      version: 1,
      created_by: adminId,
      created_at: now,
      updated_at: now,
    },
  ]);

  // Steps for Template 1: Incident-Eskalation
  await db.insert(workflowSteps).values([
    {
      id: uuidv4(),
      template_id: wfTemplate1Id,
      name: 'Erstbewertung',
      step_order: 1,
      step_type: 'form',
      config: JSON.stringify({ fields: [{ name: 'severity', label: 'Schweregrad', type: 'text', required: true }, { name: 'affected_systems', label: 'Betroffene Systeme', type: 'text', required: true }] }),
      timeout_hours: 2,
      next_step_id: null,
    },
    {
      id: uuidv4(),
      template_id: wfTemplate1Id,
      name: 'Eskalation notwendig?',
      step_order: 2,
      step_type: 'routing',
      config: JSON.stringify({ options: [{ label: 'Ja – Eskalieren', next_step_id: null }, { label: 'Nein – Direkt lösen', next_step_id: null }] }),
      timeout_hours: 1,
      next_step_id: null,
    },
    {
      id: uuidv4(),
      template_id: wfTemplate1Id,
      name: 'Eskalations-Genehmigung',
      step_order: 3,
      step_type: 'approval',
      config: JSON.stringify({ require_all: false }),
      timeout_hours: 4,
      next_step_id: null,
    },
    {
      id: uuidv4(),
      template_id: wfTemplate1Id,
      name: 'Status auf "In Bearbeitung" setzen',
      step_order: 4,
      step_type: 'automatic',
      config: JSON.stringify({ action: 'set_status', params: { status: 'in_progress' } }),
      timeout_hours: null,
      next_step_id: null,
    },
    {
      id: uuidv4(),
      template_id: wfTemplate1Id,
      name: 'Abschlussdokumentation',
      step_order: 5,
      step_type: 'form',
      config: JSON.stringify({ fields: [{ name: 'resolution', label: 'Lösung', type: 'textarea', required: true }, { name: 'root_cause', label: 'Ursache', type: 'text', required: false }] }),
      timeout_hours: 24,
      next_step_id: null,
    },
  ]);

  // Steps for Template 2: Change-Genehmigung
  await db.insert(workflowSteps).values([
    {
      id: uuidv4(),
      template_id: wfTemplate2Id,
      name: 'Change-Antrag',
      step_order: 1,
      step_type: 'form',
      config: JSON.stringify({ fields: [{ name: 'change_reason', label: 'Änderungsgrund', type: 'textarea', required: true }, { name: 'impact', label: 'Auswirkung', type: 'text', required: true }, { name: 'rollback_plan', label: 'Rollback-Plan', type: 'textarea', required: true }] }),
      timeout_hours: 8,
      next_step_id: null,
    },
    {
      id: uuidv4(),
      template_id: wfTemplate2Id,
      name: 'CAB-Genehmigung',
      step_order: 2,
      step_type: 'approval',
      config: JSON.stringify({ require_all: true }),
      timeout_hours: 48,
      next_step_id: null,
    },
    {
      id: uuidv4(),
      template_id: wfTemplate2Id,
      name: 'Impact-Prüfung',
      step_order: 3,
      step_type: 'condition',
      config: JSON.stringify({ field: 'priority', operator: 'eq', value: 'critical', next_step_id_true: null, next_step_id_false: null }),
      timeout_hours: null,
      next_step_id: null,
    },
    {
      id: uuidv4(),
      template_id: wfTemplate2Id,
      name: 'Notfall-CAB',
      step_order: 4,
      step_type: 'approval',
      config: JSON.stringify({ require_all: false }),
      timeout_hours: 4,
      next_step_id: null,
    },
    {
      id: uuidv4(),
      template_id: wfTemplate2Id,
      name: 'Status auf "In Bearbeitung" setzen',
      step_order: 5,
      step_type: 'automatic',
      config: JSON.stringify({ action: 'set_status', params: { status: 'in_progress' } }),
      timeout_hours: null,
      next_step_id: null,
    },
  ]);

  logger.info('  ✓ Workflows: 2 templates + 10 steps');

  // ─── Knowledge Base ──────────────────────────────────────
  const kb1Id = uuidv4();
  const kb2Id = uuidv4();
  const kb3Id = uuidv4();
  const kb4Id = uuidv4();
  const kb5Id = uuidv4();

  await db.insert(kbArticles).values([
    {
      id: kb1Id,
      tenant_id: tenantId,
      title: 'Exchange Server — Schnelldiagnose bei Ausfällen',
      slug: 'exchange-server-schnelldiagnose',
      content: `# Exchange Server Diagnose\n\nBei einem Ausfall des Exchange-Servers folgende Schritte durchführen:\n\n## 1. Dienste prüfen\n\`\`\`powershell\nGet-Service *Exchange* | Where-Object {$_.Status -ne "Running"}\n\`\`\`\n\n## 2. Ereignisprotokoll\n\`\`\`powershell\nGet-EventLog -LogName Application -Source *MSExchange* -EntryType Error -Newest 20\n\`\`\`\n\n## 3. Datenbanken prüfen\n\`\`\`powershell\nGet-MailboxDatabase -Status | Select Name, Mounted\n\`\`\`\n\n## Eskalation\nBei weiterhin nicht erreichbarem Server → Ticket erstellen + Eskalation an Senior Admin.`,
      category: 'E-Mail',
      tags: JSON.stringify(['exchange', 'e-mail', 'diagnose', 'ausfall']),
      visibility: 'internal',
      status: 'published',
      author_id: adminId,
      created_at: now,
      updated_at: now,
      published_at: now,
    },
    {
      id: kb2Id,
      tenant_id: tenantId,
      title: 'VPN-Verbindung einrichten (Windows)',
      slug: 'vpn-verbindung-einrichten-windows',
      content: `# VPN-Verbindung einrichten\n\nSchritt-für-Schritt-Anleitung für Windows 10/11.\n\n## Voraussetzungen\n- VPN-Client (GlobalProtect oder Cisco AnyConnect)\n- Zugangsdaten vom IT-Administrator\n\n## Einrichtung\n1. VPN-Client öffnen\n2. Server-Adresse eingeben: vpn.example.com\n3. Benutzername + Passwort eingeben\n4. Verbinden klicken\n\n## Fehlersuche\n- Firewall prüfen (Port 443 muss offen sein)\n- DNS-Auflösung testen`,
      category: 'Netzwerk',
      tags: JSON.stringify(['vpn', 'netzwerk', 'remote', 'windows']),
      visibility: 'public',
      status: 'published',
      author_id: adminId,
      created_at: now,
      updated_at: now,
      published_at: now,
    },
    {
      id: kb3Id,
      tenant_id: tenantId,
      title: 'Passwort zurücksetzen — Self-Service Portal',
      slug: 'passwort-zuruecksetzen-self-service',
      content: `# Passwort zurücksetzen\n\nNutzer können ihr Passwort selbst zurücksetzen ohne den Helpdesk.\n\n## Vorgehensweise\n1. https://selfservice.firma.de aufrufen\n2. Auf "Passwort vergessen?" klicken\n3. E-Mail-Adresse eingeben\n4. Bestätigungs-E-Mail abwarten (max. 5 Minuten)\n5. Link anklicken und neues Passwort setzen\n\n## Passwort-Anforderungen\n- Mindestens 12 Zeichen\n- Groß- und Kleinbuchstaben\n- Mindestens eine Zahl\n- Mindestens ein Sonderzeichen`,
      category: 'Benutzerverwaltung',
      tags: JSON.stringify(['passwort', 'self-service', 'sicherheit']),
      visibility: 'public',
      status: 'published',
      author_id: agentId,
      created_at: now,
      updated_at: now,
      published_at: now,
    },
    {
      id: kb4Id,
      tenant_id: tenantId,
      title: 'Druckerproblem beheben — Standardlösung',
      slug: 'druckerproblem-behebenstandard',
      content: `# Druckerprobleme lösen\n\n## Häufige Ursachen und Lösungen\n\n### Drucker offline\n1. Drucker aus- und einschalten\n2. Druckerwarteschlange leeren\n3. Druckertreiber neu installieren\n\n### Druckerwarteschlange hängt\n\`\`\`cmd\nnet stop spooler\ndel /Q /F /S "%systemroot%\\System32\\spool\\PRINTERS\\*.*"\nnet start spooler\n\`\`\`\n\n### Drucker nicht gefunden\n- Netzwerkverbindung prüfen\n- IP-Adresse des Druckers anpingen`,
      category: 'Hardware',
      tags: JSON.stringify(['drucker', 'hardware', 'drucken']),
      visibility: 'internal',
      status: 'published',
      author_id: agentId,
      created_at: now,
      updated_at: now,
      published_at: now,
    },
    {
      id: kb5Id,
      tenant_id: tenantId,
      title: 'SLA-Definitionen und Reaktionszeiten',
      slug: 'sla-definitionen-reaktionszeiten',
      content: `# SLA-Definitionen\n\n## Prioritätsstufen\n\n| Priorität | Reaktionszeit | Lösungszeit |\n|-----------|--------------|-------------|\n| Kritisch  | 15 Minuten   | 4 Stunden   |\n| Hoch      | 1 Stunde     | 8 Stunden   |\n| Mittel    | 4 Stunden    | 2 Werktage  |\n| Niedrig   | 8 Stunden    | 5 Werktage  |\n\n## Eskalationspfad\n1. Level 1: Helpdesk-Techniker\n2. Level 2: Senior Administrator\n3. Level 3: Vendor-Eskalation\n\n## Ausnahmen\n- Geplante Wartungsfenster: Samstag 22:00–02:00 Uhr\n- SLA gilt nicht für Wartungsfenster`,
      category: 'Betrieb',
      tags: JSON.stringify(['sla', 'reaktionszeiten', 'eskalation', 'betrieb']),
      visibility: 'internal',
      status: 'published',
      author_id: managerId,
      created_at: now,
      updated_at: now,
      published_at: now,
    },
  ]);

  // Link first KB article to the major incident (INC-2026-00001)
  await db.insert(kbArticleLinks).values({
    article_id: kb1Id,
    ticket_id: majorIncidentId,
    tenant_id: tenantId,
  });

  logger.info('  ✓ Knowledge Base: 5 articles + 1 ticket link');

  // ─── Service Descriptions ─────────────────────────────
  const svcEmailId = uuidv4();
  const svcDatabaseId = uuidv4();
  const svcNetworkId = uuidv4();
  const svcWebHostingId = uuidv4();
  const svcBackupId = uuidv4();
  const svcMonitoringId = uuidv4();
  const svcSecurityId = uuidv4();
  const svcWorkplaceId = uuidv4();

  await db.insert(serviceDescriptions).values([
    {
      id: svcEmailId,
      tenant_id: tenantId,
      code: 'SVC-EMAIL',
      title: 'E-Mail Service',
      description: 'Bereitstellung und Betrieb des E-Mail-Systems inkl. Exchange/IMAP, Spam-Filter und Archivierung.',
      scope_included: 'E-Mail-Server Betrieb, Spam-/Virenschutz, Postfach-Verwaltung bis 50 GB, Mobile-Sync',
      scope_excluded: 'E-Mail-Migration von Drittanbietern, Marketing-Mails, Newsletter-Versand',
      compliance_tags: '["dsgvo","iso27001"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcDatabaseId,
      tenant_id: tenantId,
      code: 'SVC-DB',
      title: 'Datenbank Service',
      description: 'Betrieb und Wartung von relationalen Datenbanksystemen (MySQL, PostgreSQL) inkl. Backup und Replikation.',
      scope_included: 'DB-Installation, Konfiguration, Patch-Management, tägliche Backups, Performance-Monitoring',
      scope_excluded: 'Applikationsspezifische Datenbankoptimierung, Schema-Design, Datenmigration',
      compliance_tags: '["dsgvo","iso27001","bsi"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcNetworkId,
      tenant_id: tenantId,
      code: 'SVC-NET',
      title: 'Netzwerk & Konnektivität',
      description: 'Bereitstellung und Betrieb der Netzwerk-Infrastruktur inkl. LAN, WAN, VPN und Firewall.',
      scope_included: 'Switching, Routing, Firewall-Management, VPN-Zugänge, WLAN, DNS/DHCP',
      scope_excluded: 'ISP-Leitungen, Mobilfunkverträge, Standortvernetzung über Drittanbieter',
      compliance_tags: '["iso27001","bsi"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcWebHostingId,
      tenant_id: tenantId,
      code: 'SVC-WEB',
      title: 'Web-Hosting & Applikationsbetrieb',
      description: 'Hosting und Betrieb von Web-Applikationen auf virtuellen Servern inkl. Load Balancing und SSL.',
      scope_included: 'VM-Bereitstellung, Webserver-Konfiguration, SSL-Zertifikate, Load Balancing, Deployment-Support',
      scope_excluded: 'Applikationsentwicklung, Content-Management, SEO-Optimierung',
      compliance_tags: '["dsgvo","iso27001"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcBackupId,
      tenant_id: tenantId,
      code: 'SVC-BKP',
      title: 'Backup & Recovery',
      description: 'Datensicherung und Wiederherstellung für Server, Datenbanken und Applikationen.',
      scope_included: 'Tägliche Backups, 30-Tage-Retention, Restore-Tests, Off-Site-Kopie, Backup-Monitoring',
      scope_excluded: 'Langzeitarchivierung (>1 Jahr), Backup von Client-Geräten, Cloud-Backup',
      compliance_tags: '["iso27001","bsi"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcMonitoringId,
      tenant_id: tenantId,
      code: 'SVC-MON',
      title: 'Monitoring & Alerting',
      description: 'Überwachung der IT-Infrastruktur und Applikationen mit automatischer Alarmierung bei Störungen.',
      scope_included: 'Server-Monitoring, Netzwerk-Monitoring, Applikations-Checks, Alert-Routing, Dashboards',
      scope_excluded: 'Application Performance Monitoring (APM), Log-Analyse, Business-KPIs',
      compliance_tags: '["iso27001"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcSecurityId,
      tenant_id: tenantId,
      code: 'SVC-SEC',
      title: 'IT-Sicherheit & Compliance',
      description: 'Sicherheitsmaßnahmen zum Schutz der IT-Infrastruktur inkl. Vulnerability-Management und Patch-Prozess.',
      scope_included: 'Patch-Management, Vulnerability-Scans, Firewall-Regeln, Endpoint-Security, Security-Audits',
      scope_excluded: 'Penetration-Testing, SOC-Dienste, Forensische Analysen',
      compliance_tags: '["dsgvo","iso27001","bsi","kritis"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcWorkplaceId,
      tenant_id: tenantId,
      code: 'SVC-WKP',
      title: 'Arbeitsplatz & Endgeräte',
      description: 'Bereitstellung und Support von Arbeitsplatz-IT inkl. Laptops, Drucker und Peripherie.',
      scope_included: 'Hardware-Bereitstellung, Software-Installation, Helpdesk-Support, Drucker-Management',
      scope_excluded: 'Privat genutzte Geräte, Spezial-Hardware, Software-Lizenzbeschaffung',
      compliance_tags: '["dsgvo"]',
      version: 1,
      status: 'draft',
      created_at: now,
      updated_at: now,
    },
  ]);
  logger.info('  ✓ Service Descriptions: 8 service descriptions');

  // ─── Service Scope Items (REQ-2.2c) ────────────────────
  await db.insert(serviceScopeItems).values([
    // SVC-EMAIL scope items
    { id: uuidv4(), tenant_id: tenantId, service_id: svcEmailId, item_description: 'E-Mail-Server Betrieb (Exchange/IMAP)', scope_type: 'included', sort_order: 0, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcEmailId, item_description: 'Spam- und Virenschutz', scope_type: 'included', sort_order: 1, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcEmailId, item_description: 'Postfach-Verwaltung bis 50 GB', scope_type: 'included', sort_order: 2, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcEmailId, item_description: 'Mobile-Sync (ActiveSync)', scope_type: 'included', sort_order: 3, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcEmailId, item_description: 'E-Mail-Migration von Drittanbietern', scope_type: 'excluded', sort_order: 4, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcEmailId, item_description: 'Marketing-Mails und Newsletter-Versand', scope_type: 'excluded', sort_order: 5, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcEmailId, item_description: 'E-Mail-Archivierung (10 Jahre)', scope_type: 'addon', sort_order: 6, notes: 'Kostenpflichtige Zusatzleistung', created_at: now, updated_at: now },
    // SVC-DB scope items
    { id: uuidv4(), tenant_id: tenantId, service_id: svcDatabaseId, item_description: 'DB-Installation und Konfiguration', scope_type: 'included', sort_order: 0, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcDatabaseId, item_description: 'Patch-Management und Updates', scope_type: 'included', sort_order: 1, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcDatabaseId, item_description: 'Tägliche Backups mit 30-Tage-Retention', scope_type: 'included', sort_order: 2, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcDatabaseId, item_description: 'Applikationsspezifische DB-Optimierung', scope_type: 'excluded', sort_order: 3, notes: 'Verantwortung des Applikationsteams', created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcDatabaseId, item_description: 'Schema-Design und Datenmigration', scope_type: 'excluded', sort_order: 4, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcDatabaseId, item_description: 'Read-Replica Bereitstellung', scope_type: 'optional', sort_order: 5, notes: 'Auf Anfrage verfügbar', created_at: now, updated_at: now },
    // SVC-NET scope items
    { id: uuidv4(), tenant_id: tenantId, service_id: svcNetworkId, item_description: 'Switching und Routing', scope_type: 'included', sort_order: 0, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcNetworkId, item_description: 'Firewall-Management', scope_type: 'included', sort_order: 1, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcNetworkId, item_description: 'VPN-Zugänge und WLAN', scope_type: 'included', sort_order: 2, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcNetworkId, item_description: 'ISP-Leitungen und Mobilfunkverträge', scope_type: 'excluded', sort_order: 3, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcNetworkId, item_description: 'SD-WAN Overlay-Netzwerk', scope_type: 'addon', sort_order: 4, notes: 'Enterprise-Zusatzleistung', created_at: now, updated_at: now },
    // SVC-BKP scope items
    { id: uuidv4(), tenant_id: tenantId, service_id: svcBackupId, item_description: 'Tägliche Backups aller Server', scope_type: 'included', sort_order: 0, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcBackupId, item_description: '30-Tage-Retention und Off-Site-Kopie', scope_type: 'included', sort_order: 1, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcBackupId, item_description: 'Restore-Tests (monatlich)', scope_type: 'included', sort_order: 2, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcBackupId, item_description: 'Langzeitarchivierung (>1 Jahr)', scope_type: 'excluded', sort_order: 3, notes: null, created_at: now, updated_at: now },
    { id: uuidv4(), tenant_id: tenantId, service_id: svcBackupId, item_description: 'Client-Geräte-Backup', scope_type: 'optional', sort_order: 4, notes: 'Erfordert Endpoint-Agent', created_at: now, updated_at: now },
  ]);
  logger.info('  ✓ Service Scope Items: 23 scope items for 4 services');

  // ─── Horizontal Catalog ────────────────────────────────
  const catalogStandardId = uuidv4();
  const catalogPremiumId = uuidv4();

  await db.insert(horizontalCatalog).values([
    {
      id: catalogStandardId,
      tenant_id: tenantId,
      name: 'Standard IT-Services',
      description: 'Basiskatalog mit allen Standard-IT-Dienstleistungen für interne Kunden.',
      status: 'active',
      created_at: now,
    },
    {
      id: catalogPremiumId,
      tenant_id: tenantId,
      name: 'Premium IT-Services',
      description: 'Erweiterter Katalog mit zusätzlichen Leistungen für Premium-Kunden (SLA Gold/Platinum).',
      status: 'active',
      created_at: now,
    },
  ]);

  // Standard catalog: Email, Network, Backup, Workplace, Monitoring
  await db.insert(horizontalCatalogItems).values([
    { catalog_id: catalogStandardId, service_desc_id: svcEmailId },
    { catalog_id: catalogStandardId, service_desc_id: svcNetworkId },
    { catalog_id: catalogStandardId, service_desc_id: svcBackupId },
    { catalog_id: catalogStandardId, service_desc_id: svcMonitoringId },
  ]);

  // Premium catalog: All standard + Database, WebHosting, Security
  await db.insert(horizontalCatalogItems).values([
    { catalog_id: catalogPremiumId, service_desc_id: svcEmailId },
    { catalog_id: catalogPremiumId, service_desc_id: svcDatabaseId },
    { catalog_id: catalogPremiumId, service_desc_id: svcNetworkId },
    { catalog_id: catalogPremiumId, service_desc_id: svcWebHostingId },
    { catalog_id: catalogPremiumId, service_desc_id: svcBackupId },
    { catalog_id: catalogPremiumId, service_desc_id: svcMonitoringId },
    { catalog_id: catalogPremiumId, service_desc_id: svcSecurityId },
  ]);
  logger.info('  ✓ Horizontal Catalogs: 2 catalogs (Standard + Premium) with items');

  // ─── Additional Horizontal Catalogs ─────────────────────
  const catalogDevOpsId = uuidv4();
  const catalogManagedId = uuidv4();

  await db.insert(horizontalCatalog).values([
    {
      id: catalogDevOpsId,
      tenant_id: tenantId,
      name: 'DevOps & Entwicklung',
      description: 'Services für Entwicklungsteams: CI/CD, Versionskontrolle, Container-Plattform, Entwicklungsumgebungen.',
      status: 'active',
      created_at: now,
    },
    {
      id: catalogManagedId,
      tenant_id: tenantId,
      name: 'Managed Infrastructure',
      description: 'Vollständig verwaltete Infrastruktur-Services inkl. Betrieb, Monitoring und Incident-Response.',
      status: 'active',
      created_at: now,
    },
  ]);

  // Add new service descriptions for DevOps catalog
  const svcCiCdId = uuidv4();
  const svcContainerId = uuidv4();
  const svcDevEnvId = uuidv4();
  const svcIdentityId = uuidv4();

  await db.insert(serviceDescriptions).values([
    {
      id: svcCiCdId,
      tenant_id: tenantId,
      code: 'SVC-CICD',
      title: 'CI/CD Pipeline Service',
      description: 'Bereitstellung und Betrieb von Continuous Integration/Deployment Pipelines auf Basis von Jenkins und GitLab CI.',
      scope_included: 'Pipeline-Konfiguration, Build-Agents, Artefakt-Management, Deployment-Automation',
      scope_excluded: 'Entwicklung von Build-Skripten, Code-Reviews, Test-Automation',
      compliance_tags: '["iso27001"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcContainerId,
      tenant_id: tenantId,
      code: 'SVC-K8S',
      title: 'Container & Orchestrierung',
      description: 'Kubernetes-Cluster-Betrieb inkl. Namespace-Management, Ingress und Container-Registry.',
      scope_included: 'Cluster-Betrieb, Namespace-Verwaltung, Ingress-Controller, Image-Registry, Helm-Charts',
      scope_excluded: 'Container-Image-Erstellung, Applikations-Debugging, Custom Operators',
      compliance_tags: '["iso27001","bsi"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcDevEnvId,
      tenant_id: tenantId,
      code: 'SVC-DEV',
      title: 'Entwicklungsumgebungen',
      description: 'Bereitstellung von Entwicklungs- und Staging-Umgebungen inkl. Datenbank-Snapshots und Test-Daten.',
      scope_included: 'VM-/Container-Bereitstellung, DB-Snapshots, Test-Daten, VPN-Zugang',
      scope_excluded: 'IDE-Lizenzen, lokale Entwicklungsrechner, Schulungen',
      compliance_tags: '[]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
    {
      id: svcIdentityId,
      tenant_id: tenantId,
      code: 'SVC-IAM',
      title: 'Identity & Access Management',
      description: 'Zentrales Identitäts- und Zugriffsmanagement über Active Directory, OIDC und SAML.',
      scope_included: 'AD-Verwaltung, SSO-Integration, MFA-Bereitstellung, Gruppenrichtlinien, Berechtigungsmanagement',
      scope_excluded: 'Lizenzbeschaffung für IdP-Software, Compliance-Audits, Penetration-Tests',
      compliance_tags: '["dsgvo","iso27001","bsi"]',
      version: 1,
      status: 'published',
      created_at: now,
      updated_at: now,
    },
  ]);
  logger.info('  ✓ Extended Service Descriptions: 4 additional services');

  // DevOps catalog items
  await db.insert(horizontalCatalogItems).values([
    { catalog_id: catalogDevOpsId, service_desc_id: svcCiCdId },
    { catalog_id: catalogDevOpsId, service_desc_id: svcContainerId },
    { catalog_id: catalogDevOpsId, service_desc_id: svcDevEnvId },
    { catalog_id: catalogDevOpsId, service_desc_id: svcMonitoringId },
  ]);

  // Managed Infrastructure = Premium + Identity
  await db.insert(horizontalCatalogItems).values([
    { catalog_id: catalogManagedId, service_desc_id: svcEmailId },
    { catalog_id: catalogManagedId, service_desc_id: svcDatabaseId },
    { catalog_id: catalogManagedId, service_desc_id: svcNetworkId },
    { catalog_id: catalogManagedId, service_desc_id: svcBackupId },
    { catalog_id: catalogManagedId, service_desc_id: svcMonitoringId },
    { catalog_id: catalogManagedId, service_desc_id: svcSecurityId },
    { catalog_id: catalogManagedId, service_desc_id: svcIdentityId },
    { catalog_id: catalogManagedId, service_desc_id: svcContainerId },
  ]);
  logger.info('  ✓ Extended Horizontal Catalogs: DevOps (4 items), Managed Infrastructure (8 items)');

  // ─── Extended Customers (needed for Vertical Catalogs) ───
  const customerBankId = uuidv4();
  const customerLogistikId = uuidv4();
  const customerRetailId = uuidv4();
  const customerEnergieId = uuidv4();
  const customerStadtwerkeId = uuidv4();

  await db.insert(customers).values([
    { id: customerBankId, tenant_id: tenantId, name: 'Volksbank Rhein-Main eG', industry: 'Finanzdienstleistungen', contact_email: 'it@vb-rhein-main.de', is_active: 1, created_at: now },
    { id: customerLogistikId, tenant_id: tenantId, name: 'Schnell Logistik GmbH', industry: 'Logistik', contact_email: 'support@schnell-logistik.de', is_active: 1, created_at: now },
    { id: customerRetailId, tenant_id: tenantId, name: 'ModeMeyer AG', industry: 'Einzelhandel', contact_email: 'it@modemeyer.de', is_active: 1, created_at: now },
    { id: customerEnergieId, tenant_id: tenantId, name: 'GreenPower Energie GmbH', industry: 'Energie', contact_email: 'admin@greenpower-energie.de', is_active: 1, created_at: now },
    { id: customerStadtwerkeId, tenant_id: tenantId, name: 'Stadtwerke Offenbach', industry: 'Öffentlicher Dienst', contact_email: 'edv@stadtwerke-of.de', is_active: 0, created_at: now },
  ]);
  logger.info('  ✓ Extended Customers: 5 additional customers');

  // ─── Vertical Catalogs ──────────────────────────────────
  const vcBankId = uuidv4();
  const vcAcmeId = uuidv4();
  const vcMedTechId = uuidv4();

  await db.insert(verticalCatalogs).values([
    {
      id: vcBankId,
      tenant_id: tenantId,
      name: 'Volksbank Rhein-Main — Managed IT',
      base_catalog_id: catalogManagedId,
      customer_id: customerBankId,
      industry: 'Finanzdienstleistungen',
      description: 'Kundenspezifischer Katalog für die Volksbank mit erhöhten Sicherheitsanforderungen und BaFin-Compliance.',
      status: 'active',
      created_at: now,
    },
    {
      id: vcAcmeId,
      tenant_id: tenantId,
      name: 'Acme GmbH — Premium IT',
      base_catalog_id: catalogPremiumId,
      customer_id: customerAcmeId,
      industry: 'Produktion',
      description: 'Premium-Services für Acme GmbH mit angepassten SLAs und priorisiertem Support.',
      status: 'active',
      created_at: now,
    },
    {
      id: vcMedTechId,
      tenant_id: tenantId,
      name: 'MedTech Solutions — Healthcare IT',
      base_catalog_id: catalogManagedId,
      customer_id: customerMedTechId,
      industry: 'Gesundheitswesen',
      description: 'Spezialkatalog für MedTech mit erweiterten Datenschutzanforderungen (Patientendaten, MDR).',
      status: 'active',
      created_at: now,
    },
  ]);
  logger.info('  ✓ Vertical Catalogs: 3 catalogs (Bank, Acme, MedTech)');

  // Vertical catalog overrides — Bank gets enhanced security
  const svcSecurityBankId = uuidv4();
  await db.insert(serviceDescriptions).values({
    id: svcSecurityBankId,
    tenant_id: tenantId,
    code: 'SVC-SEC-BANK',
    title: 'IT-Sicherheit & Compliance (Finanz)',
    description: 'Erweiterte Sicherheitsmaßnahmen für Finanzdienstleister gemäß BaFin BAIT/DORA-Anforderungen.',
    scope_included: 'Alle Standard-Leistungen + PCI-DSS-Compliance, WAF, DDoS-Schutz, Quarterly Pentests, 4-Augen-Prinzip bei kritischen Änderungen',
    scope_excluded: 'SOC-2-Zertifizierung, Hardware Security Modules (HSM)',
    compliance_tags: '["dsgvo","iso27001","bsi","bafin","pci-dss"]',
    version: 1,
    status: 'published',
    created_at: now,
    updated_at: now,
  });

  await db.insert(verticalCatalogOverrides).values({
    id: uuidv4(),
    vertical_id: vcBankId,
    original_desc_id: svcSecurityId,
    override_desc_id: svcSecurityBankId,
    override_type: 'replace',
    reason: 'BaFin BAIT/DORA erfordern erweiterte Sicherheitsmaßnahmen für Finanzdienstleister',
  });
  logger.info('  ✓ Vertical Overrides: Bank gets enhanced security service');

  // ─── Compliance Frameworks ─────────────────────────────
  const fwIso27001Id = uuidv4();
  const fwDsgvoId = uuidv4();

  await db.insert(regulatoryFrameworks).values([
    {
      id: fwIso27001Id,
      tenant_id: tenantId,
      name: 'ISO 27001:2022',
      version: '2022',
      description: 'Informationssicherheits-Managementsystem (ISMS) — Internationale Norm für Informationssicherheit. Definiert Anforderungen an Aufbau, Umsetzung, Aufrechterhaltung und Verbesserung eines ISMS.',
      effective_date: '2022-10-25',
      created_at: now,
    },
    {
      id: fwDsgvoId,
      tenant_id: tenantId,
      name: 'DSGVO / GDPR',
      version: 'EU 2016/679',
      description: 'Datenschutz-Grundverordnung der Europäischen Union — Regelt den Umgang mit personenbezogenen Daten und die Rechte betroffener Personen.',
      effective_date: '2018-05-25',
      created_at: now,
    },
  ]);
  logger.info('  ✓ Compliance Frameworks: ISO 27001:2022, DSGVO/GDPR');

  // ─── Regulatory Requirements ───────────────────────────
  // ISO 27001 Requirements (Annex A controls — representative selection)
  const reqA5_1Id = uuidv4();
  const reqA5_2Id = uuidv4();
  const reqA6_1Id = uuidv4();
  const reqA8_1Id = uuidv4();
  const reqA8_2Id = uuidv4();
  const reqA8_3Id = uuidv4();
  const reqA12_1Id = uuidv4();
  const reqA12_3Id = uuidv4();

  await db.insert(regulatoryRequirements).values([
    {
      id: reqA5_1Id,
      framework_id: fwIso27001Id,
      code: 'A.5.1',
      title: 'Informationssicherheitsrichtlinien',
      description: 'Ein Satz von Richtlinien für die Informationssicherheit muss definiert, von der Leitung genehmigt, veröffentlicht und den Mitarbeitern kommuniziert werden.',
      category: 'Organisatorische Kontrollen',
      created_at: now,
    },
    {
      id: reqA5_2Id,
      framework_id: fwIso27001Id,
      code: 'A.5.2',
      title: 'Rollen und Verantwortlichkeiten',
      description: 'Verantwortlichkeiten und Zuständigkeiten für die Informationssicherheit müssen zugewiesen und kommuniziert werden.',
      category: 'Organisatorische Kontrollen',
      created_at: now,
    },
    {
      id: reqA6_1Id,
      framework_id: fwIso27001Id,
      code: 'A.6.1',
      title: 'Screening',
      description: 'Hintergrundüberprüfungen aller Bewerber müssen vor der Einstellung durchgeführt werden.',
      category: 'Personenbezogene Kontrollen',
      created_at: now,
    },
    {
      id: reqA8_1Id,
      framework_id: fwIso27001Id,
      code: 'A.8.1',
      title: 'Endgeräte der Benutzer',
      description: 'Informationen, die auf Endgeräten der Benutzer gespeichert oder verarbeitet werden, müssen geschützt werden.',
      category: 'Technologische Kontrollen',
      created_at: now,
    },
    {
      id: reqA8_2Id,
      framework_id: fwIso27001Id,
      code: 'A.8.2',
      title: 'Privilegierte Zugriffsrechte',
      description: 'Die Zuweisung und Nutzung von privilegierten Zugriffsrechten muss eingeschränkt und gesteuert werden.',
      category: 'Technologische Kontrollen',
      created_at: now,
    },
    {
      id: reqA8_3Id,
      framework_id: fwIso27001Id,
      code: 'A.8.3',
      title: 'Einschränkung des Informationszugangs',
      description: 'Der Zugang zu Informationen und Einrichtungen der Informationsverarbeitung muss gemäß der Zugangssteuerungspolitik eingeschränkt werden.',
      category: 'Technologische Kontrollen',
      created_at: now,
    },
    {
      id: reqA12_1Id,
      framework_id: fwIso27001Id,
      code: 'A.8.13',
      title: 'Datensicherung (Backup)',
      description: 'Sicherungskopien von Informationen, Software und Systemabbildern müssen regelmäßig erstellt und geprüft werden.',
      category: 'Technologische Kontrollen',
      created_at: now,
    },
    {
      id: reqA12_3Id,
      framework_id: fwIso27001Id,
      code: 'A.8.16',
      title: 'Überwachung von Aktivitäten',
      description: 'Netzwerke, Systeme und Anwendungen müssen auf anomales Verhalten überwacht und bei Erkennung geeignete Maßnahmen ergriffen werden.',
      category: 'Technologische Kontrollen',
      created_at: now,
    },
  ]);

  // DSGVO Requirements
  const reqDsgvo5Id = uuidv4();
  const reqDsgvo25Id = uuidv4();
  const reqDsgvo30Id = uuidv4();
  const reqDsgvo32Id = uuidv4();
  const reqDsgvo33Id = uuidv4();
  const reqDsgvo35Id = uuidv4();

  await db.insert(regulatoryRequirements).values([
    {
      id: reqDsgvo5Id,
      framework_id: fwDsgvoId,
      code: 'Art. 5',
      title: 'Grundsätze der Verarbeitung',
      description: 'Personenbezogene Daten müssen rechtmäßig, nach Treu und Glauben, transparent, zweckgebunden, datenminimiert, richtig, speicherbegrenzt und integer/vertraulich verarbeitet werden.',
      category: 'Grundsätze',
      created_at: now,
    },
    {
      id: reqDsgvo25Id,
      framework_id: fwDsgvoId,
      code: 'Art. 25',
      title: 'Datenschutz durch Technikgestaltung (Privacy by Design)',
      description: 'Der Verantwortliche muss geeignete technische und organisatorische Maßnahmen treffen, die darauf ausgelegt sind, Datenschutzgrundsätze wirksam umzusetzen.',
      category: 'Pflichten des Verantwortlichen',
      created_at: now,
    },
    {
      id: reqDsgvo30Id,
      framework_id: fwDsgvoId,
      code: 'Art. 30',
      title: 'Verzeichnis der Verarbeitungstätigkeiten',
      description: 'Jeder Verantwortliche und sein Vertreter führen ein Verzeichnis aller Verarbeitungstätigkeiten mit personenbezogenen Daten.',
      category: 'Pflichten des Verantwortlichen',
      created_at: now,
    },
    {
      id: reqDsgvo32Id,
      framework_id: fwDsgvoId,
      code: 'Art. 32',
      title: 'Sicherheit der Verarbeitung',
      description: 'Der Verantwortliche muss geeignete technische und organisatorische Maßnahmen treffen, um ein dem Risiko angemessenes Schutzniveau zu gewährleisten (Verschlüsselung, Pseudonymisierung, etc.).',
      category: 'Sicherheit',
      created_at: now,
    },
    {
      id: reqDsgvo33Id,
      framework_id: fwDsgvoId,
      code: 'Art. 33',
      title: 'Meldung von Datenschutzverletzungen',
      description: 'Datenschutzverletzungen sind unverzüglich, möglichst binnen 72 Stunden, der Aufsichtsbehörde zu melden.',
      category: 'Sicherheit',
      created_at: now,
    },
    {
      id: reqDsgvo35Id,
      framework_id: fwDsgvoId,
      code: 'Art. 35',
      title: 'Datenschutz-Folgenabschätzung',
      description: 'Bei voraussichtlich hohem Risiko für die Rechte und Freiheiten natürlicher Personen muss vorab eine Abschätzung der Folgen der vorgesehenen Verarbeitungsvorgänge durchgeführt werden.',
      category: 'Pflichten des Verantwortlichen',
      created_at: now,
    },
  ]);
  logger.info('  ✓ Regulatory Requirements: 8 ISO 27001 + 6 DSGVO requirements');

  // ─── Requirement ↔ Service Mappings (Compliance Matrix) ──
  await db.insert(requirementServiceMappings).values([
    // ISO 27001 A.5.1 — Security policy covers all services
    { requirement_id: reqA5_1Id, service_desc_id: svcSecurityId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'ISMS-Richtlinie v2.1 verabschiedet und kommuniziert', reviewed_at: now, reviewed_by: adminId },
    { requirement_id: reqA5_1Id, service_desc_id: svcNetworkId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'Netzwerk-Sicherheitsrichtlinie liegt vor', reviewed_at: now, reviewed_by: adminId },
    // ISO 27001 A.8.1 — Endpoint security
    { requirement_id: reqA8_1Id, service_desc_id: svcWorkplaceId, tenant_id: tenantId, coverage_level: 'partial', evidence_notes: 'Endpoint-Protection aktiv, Mobile-Device-Management ausstehend', reviewed_at: now, reviewed_by: managerId },
    { requirement_id: reqA8_1Id, service_desc_id: svcSecurityId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'Vollständige Endpoint-Security-Policy umgesetzt', reviewed_at: now, reviewed_by: adminId },
    // ISO 27001 A.8.2 — Privileged access
    { requirement_id: reqA8_2Id, service_desc_id: svcDatabaseId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'PAM für DB-Zugriffe implementiert', reviewed_at: now, reviewed_by: adminId },
    { requirement_id: reqA8_2Id, service_desc_id: svcNetworkId, tenant_id: tenantId, coverage_level: 'partial', evidence_notes: 'Firewall-Admin-Zugriffe noch nicht PAM-gesichert', reviewed_at: null, reviewed_by: null },
    // ISO 27001 A.8.13 — Backup
    { requirement_id: reqA12_1Id, service_desc_id: svcBackupId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'Tägliche Backups + wöchentliche Restore-Tests dokumentiert', reviewed_at: now, reviewed_by: adminId },
    { requirement_id: reqA12_1Id, service_desc_id: svcDatabaseId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'DB-Backups mit Point-in-Time Recovery', reviewed_at: now, reviewed_by: adminId },
    // ISO 27001 A.8.16 — Monitoring
    { requirement_id: reqA12_3Id, service_desc_id: svcMonitoringId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'Checkmk Monitoring mit Anomalie-Erkennung aktiv', reviewed_at: now, reviewed_by: adminId },
    { requirement_id: reqA12_3Id, service_desc_id: svcNetworkId, tenant_id: tenantId, coverage_level: 'partial', evidence_notes: 'Netzwerk-Monitoring vorhanden, Deep Packet Inspection fehlt', reviewed_at: now, reviewed_by: managerId },
    // DSGVO Art. 32 — Security of processing
    { requirement_id: reqDsgvo32Id, service_desc_id: svcEmailId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'TLS-Verschlüsselung für alle E-Mail-Verbindungen, Spam-Filter aktiv', reviewed_at: now, reviewed_by: adminId },
    { requirement_id: reqDsgvo32Id, service_desc_id: svcDatabaseId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'Verschlüsselung at-rest und in-transit, Zugriffssteuerung via RBAC', reviewed_at: now, reviewed_by: adminId },
    { requirement_id: reqDsgvo32Id, service_desc_id: svcSecurityId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'Umfassende TOM dokumentiert und umgesetzt', reviewed_at: now, reviewed_by: adminId },
    // DSGVO Art. 33 — Breach notification
    { requirement_id: reqDsgvo33Id, service_desc_id: svcSecurityId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'Incident-Response-Plan mit 72h-Meldefrist definiert', reviewed_at: now, reviewed_by: adminId },
    { requirement_id: reqDsgvo33Id, service_desc_id: svcMonitoringId, tenant_id: tenantId, coverage_level: 'partial', evidence_notes: 'Alerting vorhanden, automatische Meldekette in Umsetzung', reviewed_at: null, reviewed_by: null },
    // DSGVO Art. 25 — Privacy by Design
    { requirement_id: reqDsgvo25Id, service_desc_id: svcWebHostingId, tenant_id: tenantId, coverage_level: 'partial', evidence_notes: 'SSL/TLS per Default, Cookie-Consent ausstehend', reviewed_at: now, reviewed_by: managerId },
    { requirement_id: reqDsgvo25Id, service_desc_id: svcEmailId, tenant_id: tenantId, coverage_level: 'full', evidence_notes: 'Datensparsamkeit bei E-Mail-Logging umgesetzt', reviewed_at: now, reviewed_by: adminId },
  ]);
  logger.info('  ✓ Compliance Mappings: 17 requirement-service mappings');

  // ─── Extended Sample Data ──────────────────────────────────

  // More assets — covering different categories
  const assetMailGwId = uuidv4();
  const assetAdControllerId = uuidv4();
  const assetSanId = uuidv4();
  const assetBackupSrvId = uuidv4();
  const assetWifiApId = uuidv4();
  const assetVpnGwId = uuidv4();
  const assetPrinterFloor3Id = uuidv4();
  const assetLaptop01Id = uuidv4();
  const assetLaptop02Id = uuidv4();
  const assetPhone01Id = uuidv4();
  const assetErpId = uuidv4();
  const assetCrmId = uuidv4();
  const assetJiraId = uuidv4();
  const assetGitlabId = uuidv4();
  const assetPrometheusId = uuidv4();
  const assetK8sClusterId = uuidv4();
  const assetRedisId = uuidv4();
  const assetElasticId = uuidv4();
  const assetCiCdId = uuidv4();
  const assetDnsId = uuidv4();
  const assetProxyId = uuidv4();
  const assetTestVmId = uuidv4();
  const assetStagingVmId = uuidv4();
  const assetFileServerId = uuidv4();
  const assetUpsId = uuidv4();
  const assetPduId = uuidv4();

  await db.insert(assets).values([
    { id: assetMailGwId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'mail-gw-01', display_name: 'Mail Gateway 01', status: 'active', ip_address: '10.0.5.120', location: 'ESXi Host 01', sla_tier: 'gold', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vcpu": 4, "ram_gb": 8, "os": "Ubuntu 22.04 LTS", "software": "Postfix + SpamAssassin"}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetAdControllerId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'ad-dc-01', display_name: 'Active Directory Controller', status: 'active', ip_address: '10.0.1.5', location: 'ESXi Host 02', sla_tier: 'platinum', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vcpu": 4, "ram_gb": 16, "os": "Windows Server 2022", "role": "Primary DC"}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetSanId, tenant_id: tenantId, asset_type: 'storage', name: 'san-primary-01', display_name: 'Primary SAN Storage', status: 'active', ip_address: '10.0.10.1', location: 'RZ Frankfurt, Rack 02, HE 1-4', sla_tier: 'platinum', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vendor": "NetApp FAS8200", "capacity_tb": 100, "protocol": "iSCSI/NFS"}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetBackupSrvId, tenant_id: tenantId, asset_type: 'server_physical', name: 'backup-srv-01', display_name: 'Backup Server 01', status: 'active', ip_address: '10.0.10.20', location: 'RZ Frankfurt, Rack 02, HE 10-12', sla_tier: 'gold', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vendor": "HPE ProLiant DL380", "software": "Veeam Backup & Replication 12", "storage_tb": 50}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetWifiApId, tenant_id: tenantId, asset_type: 'network_device', name: 'wifi-ap-floor3', display_name: 'WLAN Access Point 3. OG', status: 'active', ip_address: '10.0.20.53', location: 'Bürogebäude, 3. OG, Flur', sla_tier: 'bronze', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vendor": "Ubiquiti UniFi U6 Pro", "ssids": ["Corp-WiFi", "Guest-WiFi"]}', created_at: now, updated_at: now, created_by: agentId },
    { id: assetVpnGwId, tenant_id: tenantId, asset_type: 'network_device', name: 'vpn-gw-01', display_name: 'VPN Gateway', status: 'active', ip_address: '10.0.0.5', location: 'RZ Frankfurt, Rack 01, HE 3', sla_tier: 'gold', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vendor": "Fortinet FortiGate 100F", "concurrent_tunnels": 500, "firmware": "7.4.2"}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetPrinterFloor3Id, tenant_id: tenantId, asset_type: 'printer', name: 'prt-floor3-305', display_name: 'Drucker 3. OG Raum 305', status: 'active', ip_address: '10.0.20.100', location: 'Bürogebäude, 3. OG, Raum 305', sla_tier: 'none', environment: 'production', owner_group_id: supportGroupId, customer_id: null, attributes: '{"vendor": "HP LaserJet Enterprise M507", "type": "Laser s/w"}', created_at: now, updated_at: now, created_by: agentId },
    { id: assetLaptop01Id, tenant_id: tenantId, asset_type: 'workstation', name: 'nb-ceo-01', display_name: 'Notebook CEO', status: 'active', ip_address: null, location: 'Bürogebäude, 4. OG, Vorstandsbüro', sla_tier: 'gold', environment: 'production', owner_group_id: supportGroupId, customer_id: null, attributes: '{"vendor": "Lenovo ThinkPad X1 Carbon Gen 11", "os": "Windows 11 Pro", "user": "Thomas Müller"}', created_at: now, updated_at: now, created_by: agentId },
    { id: assetLaptop02Id, tenant_id: tenantId, asset_type: 'workstation', name: 'nb-dev-01', display_name: 'Notebook Entwickler 01', status: 'active', ip_address: null, location: 'Bürogebäude, 2. OG', sla_tier: 'silver', environment: 'production', owner_group_id: supportGroupId, customer_id: null, attributes: '{"vendor": "Apple MacBook Pro 16 M3", "os": "macOS Sonoma", "user": "Lisa Schneider"}', created_at: now, updated_at: now, created_by: agentId },
    { id: assetPhone01Id, tenant_id: tenantId, asset_type: 'mobile_device', name: 'phone-ceo-01', display_name: 'Diensthandy CEO', status: 'active', ip_address: null, location: 'Mobil', sla_tier: 'gold', environment: 'production', owner_group_id: supportGroupId, customer_id: null, attributes: '{"vendor": "Apple iPhone 15 Pro", "mdm": true, "user": "Thomas Müller"}', created_at: now, updated_at: now, created_by: agentId },
    { id: assetErpId, tenant_id: tenantId, asset_type: 'application', name: 'erp-sap-prod', display_name: 'SAP ERP Production', status: 'active', ip_address: '10.0.4.10', location: 'ESXi Host 01', sla_tier: 'platinum', environment: 'production', owner_group_id: devGroupId, customer_id: customerBankId, attributes: '{"version": "SAP S/4HANA 2023", "modules": ["FI", "CO", "MM", "SD"]}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetCrmId, tenant_id: tenantId, asset_type: 'application', name: 'crm-salesforce', display_name: 'Salesforce CRM', status: 'active', ip_address: null, location: 'Cloud (SaaS)', sla_tier: 'silver', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"edition": "Enterprise", "users": 85, "integrations": ["ERP", "Email"]}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetJiraId, tenant_id: tenantId, asset_type: 'application', name: 'jira-cloud', display_name: 'Jira Cloud', status: 'active', ip_address: null, location: 'Cloud (SaaS)', sla_tier: 'silver', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"edition": "Premium", "projects": 12}', created_at: now, updated_at: now, created_by: managerId },
    { id: assetGitlabId, tenant_id: tenantId, asset_type: 'application', name: 'gitlab-prod', display_name: 'GitLab CE', status: 'active', ip_address: '10.0.5.120', location: 'ESXi Host 02', sla_tier: 'gold', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"version": "16.8", "runners": 4, "repos": 67}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetPrometheusId, tenant_id: tenantId, asset_type: 'application', name: 'prometheus-prod', display_name: 'Prometheus Monitoring', status: 'active', ip_address: '10.0.5.120', location: 'ESXi Host 02', sla_tier: 'gold', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"version": "2.49", "targets": 142, "retention_days": 30}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetK8sClusterId, tenant_id: tenantId, asset_type: 'container_platform', name: 'k8s-prod-01', display_name: 'Kubernetes Production Cluster', status: 'active', ip_address: '10.0.6.1', location: 'RZ Frankfurt', sla_tier: 'platinum', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"version": "1.29", "nodes": 6, "pods": 87, "distribution": "RKE2"}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetRedisId, tenant_id: tenantId, asset_type: 'database', name: 'redis-cache-01', display_name: 'Redis Cache Cluster', status: 'active', ip_address: '10.0.3.20', location: 'ESXi Host 01', sla_tier: 'gold', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"version": "7.2", "mode": "cluster", "nodes": 3, "memory_gb": 32}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetElasticId, tenant_id: tenantId, asset_type: 'database', name: 'elastic-prod-01', display_name: 'Elasticsearch Cluster', status: 'active', ip_address: '10.0.3.30', location: 'ESXi Host 02', sla_tier: 'silver', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"version": "8.12", "nodes": 3, "indices": 45, "size_gb": 120}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetCiCdId, tenant_id: tenantId, asset_type: 'application', name: 'jenkins-prod', display_name: 'Jenkins CI/CD', status: 'active', ip_address: '10.0.5.120', location: 'ESXi Host 02', sla_tier: 'silver', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"version": "2.440", "agents": 8, "pipelines": 34}', created_at: now, updated_at: now, created_by: managerId },
    { id: assetDnsId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'dns-ns-01', display_name: 'DNS Server 01', status: 'active', ip_address: '10.0.1.2', location: 'ESXi Host 01', sla_tier: 'platinum', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"os": "Ubuntu 22.04", "software": "BIND 9.18", "zones": 23}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetProxyId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'proxy-squid-01', display_name: 'Web Proxy', status: 'active', ip_address: '10.0.1.3', location: 'ESXi Host 02', sla_tier: 'silver', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"os": "Ubuntu 22.04", "software": "Squid 5.7", "users": 200}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetTestVmId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'test-vm-01', display_name: 'Test VM 01', status: 'active', ip_address: '10.0.100.10', location: 'ESXi Host 02', sla_tier: 'none', environment: 'test', owner_group_id: devGroupId, customer_id: null, attributes: '{"vcpu": 2, "ram_gb": 4, "os": "Ubuntu 22.04"}', created_at: now, updated_at: now, created_by: agentId },
    { id: assetStagingVmId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'staging-app-01', display_name: 'Staging Application Server', status: 'active', ip_address: '10.0.100.20', location: 'ESXi Host 02', sla_tier: 'none', environment: 'staging', owner_group_id: devGroupId, customer_id: null, attributes: '{"vcpu": 4, "ram_gb": 8, "os": "Ubuntu 22.04"}', created_at: now, updated_at: now, created_by: managerId },
    { id: assetFileServerId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'file-srv-01', display_name: 'Fileserver 01', status: 'active', ip_address: '10.0.2.50', location: 'ESXi Host 01', sla_tier: 'silver', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"os": "Windows Server 2022", "shares": 15, "size_tb": 8}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetUpsId, tenant_id: tenantId, asset_type: 'power_supply', name: 'ups-rack01', display_name: 'USV Rack 01', status: 'active', ip_address: '10.0.0.200', location: 'RZ Frankfurt, Rack 01, HE 45', sla_tier: 'gold', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vendor": "APC Smart-UPS 3000", "capacity_va": 3000, "runtime_min": 15}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetPduId, tenant_id: tenantId, asset_type: 'power_supply', name: 'pdu-rack01-a', display_name: 'PDU Rack 01 A-Seite', status: 'active', ip_address: '10.0.0.201', location: 'RZ Frankfurt, Rack 01', sla_tier: 'none', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vendor": "APC Metered Rack PDU", "outlets": 24, "amps": 32}', created_at: now, updated_at: now, created_by: adminId },
  ]);
  logger.info('  ✓ Extended Assets: 26 additional assets');

  // Extended Asset Relations (REQ-3.2a: with structured properties)
  await db.insert(assetRelations).values([
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetMailGwId, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 2, ram_gb: 8, storage_gb: 100 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetAdControllerId, target_asset_id: assetEsxi02Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 4, ram_gb: 16, storage_gb: 200 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetDnsId, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 2, ram_gb: 4, storage_gb: 50 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetProxyId, target_asset_id: assetEsxi02Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 2, ram_gb: 8, storage_gb: 80 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetFileServerId, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 4, ram_gb: 16, storage_gb: 2000 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetGitlabId, target_asset_id: assetEsxi02Id, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 8, ram_gb: 32, storage_gb: 500 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetRedisId, target_asset_id: assetK8sClusterId, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 2, ram_gb: 8, storage_gb: 20 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetElasticId, target_asset_id: assetK8sClusterId, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 8, ram_gb: 32, storage_gb: 1000 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetErpId, target_asset_id: assetMysqlId, relation_type: 'depends_on', properties: JSON.stringify({ dependency_type: 'hard', priority: 'critical' }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetErpId, target_asset_id: assetAdControllerId, relation_type: 'depends_on', properties: JSON.stringify({ dependency_type: 'hard', priority: 'high' }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetGitlabId, target_asset_id: assetRedisId, relation_type: 'depends_on', properties: JSON.stringify({ dependency_type: 'soft', priority: 'medium' }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetCiCdId, target_asset_id: assetGitlabId, relation_type: 'depends_on', properties: JSON.stringify({ dependency_type: 'hard', priority: 'high' }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetPrometheusId, target_asset_id: assetK8sClusterId, relation_type: 'runs_on', properties: JSON.stringify({ cpu_cores: 4, ram_gb: 16, storage_gb: 500 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetBackupSrvId, target_asset_id: assetSanId, relation_type: 'depends_on', properties: JSON.stringify({ dependency_type: 'hard', priority: 'critical' }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetUpsId, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetPduId, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetVpnGwId, target_asset_id: assetFwId, relation_type: 'connected_to', properties: JSON.stringify({ bandwidth_mbps: 1000, latency_ms: 2, vlan: 50 }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetFileServerId, target_asset_id: assetSanId, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
  ]);
  logger.info('  ✓ Extended Relations: 18 additional relations');

  // Asset-Service Links (vertical catalogs → assets)
  await db.insert(assetServiceLinks).values([
    { asset_id: assetErpId, vertical_id: vcBankId, tenant_id: tenantId, effective_from: '2025-01-01', effective_until: null },
    { asset_id: assetWeb01Id, vertical_id: vcAcmeId, tenant_id: tenantId, effective_from: '2025-01-01', effective_until: null },
    { asset_id: assetWeb02Id, vertical_id: vcAcmeId, tenant_id: tenantId, effective_from: '2025-01-01', effective_until: null },
    { asset_id: assetDb01Id, vertical_id: vcMedTechId, tenant_id: tenantId, effective_from: '2025-06-01', effective_until: null },
  ]);
  logger.info('  ✓ Asset-Service Links: 4 links');

  // ─── Extended Tickets (30+ more) ──────────────────────────
  const h = 1000 * 60 * 60; // 1 hour in ms
  const d = h * 24; // 1 day in ms

  const extendedTickets = [
    // --- Recent open incidents ---
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00005', ticket_type: 'incident' as const, subtype: null, title: 'SAP-Login für Buchhaltung nicht möglich', description: 'Die Buchhaltungsabteilung kann sich seit 09:00 Uhr nicht mehr am SAP-System anmelden. Fehlermeldung: "User locked"', status: 'open' as const, priority: 'critical' as const, impact: 'high' as const, urgency: 'critical' as const, asset_id: assetErpId, assignee_id: managerId, assignee_group_id: devGroupId, reporter_id: viewerId, customer_id: customerBankId, category_id: catApplikationId, workflow_instance_id: null, current_step_id: null, sla_tier: 'platinum', sla_response_due: new Date(Date.now() + 15 * 60 * 1000).toISOString(), sla_resolve_due: new Date(Date.now() + 2 * h).toISOString(), sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: viewerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00006', ticket_type: 'incident' as const, subtype: null, title: 'Fileserver-Freigabe nicht erreichbar', description: 'Die Netzwerkfreigabe \\\\file-srv-01\\shared ist für mehrere Abteilungen nicht erreichbar.', status: 'open' as const, priority: 'high' as const, impact: 'high' as const, urgency: 'high' as const, asset_id: assetFileServerId, assignee_id: agentId, assignee_group_id: opsGroupId, reporter_id: managerId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: new Date(Date.now() + 1 * h).toISOString(), sla_resolve_due: new Date(Date.now() + 8 * h).toISOString(), sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: managerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00007', ticket_type: 'incident' as const, subtype: null, title: 'WLAN im 3. OG ausgefallen', description: 'Kein WLAN-Empfang im gesamten 3. Obergeschoss. Access Point scheint offline zu sein.', status: 'in_progress' as const, priority: 'medium' as const, impact: 'medium' as const, urgency: 'medium' as const, asset_id: assetWifiApId, assignee_id: agentId, assignee_group_id: supportGroupId, reporter_id: viewerId, customer_id: null, category_id: catNetzwerkId, workflow_instance_id: null, current_step_id: null, sla_tier: 'bronze', sla_response_due: new Date(Date.now() + 2 * h).toISOString(), sla_resolve_due: new Date(Date.now() + 24 * h).toISOString(), sla_breached: 0, parent_ticket_id: null, source: 'portal' as const, created_at: new Date(Date.now() - 2 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: viewerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00008', ticket_type: 'incident' as const, subtype: null, title: 'Kubernetes-Pods in CrashLoopBackOff', description: 'Mehrere Pods im Production-Namespace starten nicht mehr. Logs zeigen OOM-Kills.', status: 'in_progress' as const, priority: 'critical' as const, impact: 'high' as const, urgency: 'critical' as const, asset_id: assetK8sClusterId, assignee_id: managerId, assignee_group_id: opsGroupId, reporter_id: adminId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: 'platinum', sla_response_due: new Date(Date.now() - 10 * 60 * 1000).toISOString(), sla_resolve_due: new Date(Date.now() + 3 * h).toISOString(), sla_breached: 1, parent_ticket_id: null, source: 'monitoring' as const, created_at: new Date(Date.now() - 3 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00009', ticket_type: 'incident' as const, subtype: null, title: 'Jenkins-Builds schlagen fehl', description: 'Seit heute Morgen schlagen alle Jenkins-Builds mit "Disk space too low" fehl.', status: 'open' as const, priority: 'high' as const, impact: 'medium' as const, urgency: 'high' as const, asset_id: assetCiCdId, assignee_id: null, assignee_group_id: devGroupId, reporter_id: managerId, customer_id: null, category_id: catApplikationId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: new Date(Date.now() + 1 * h).toISOString(), sla_resolve_due: new Date(Date.now() + 8 * h).toISOString(), sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 1 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: managerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00010', ticket_type: 'incident' as const, subtype: null, title: 'USV-Alarm im Serverraum', description: 'Die USV im Rack 01 zeigt einen Batterie-Alarm. Laufzeit auf 5 Minuten reduziert.', status: 'open' as const, priority: 'critical' as const, impact: 'high' as const, urgency: 'critical' as const, asset_id: assetUpsId, assignee_id: agentId, assignee_group_id: opsGroupId, reporter_id: adminId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: new Date(Date.now() + 30 * 60 * 1000).toISOString(), sla_resolve_due: new Date(Date.now() + 4 * h).toISOString(), sla_breached: 0, parent_ticket_id: null, source: 'monitoring' as const, created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00011', ticket_type: 'incident' as const, subtype: null, title: 'Elasticsearch-Cluster Yellow Status', description: 'Der Elasticsearch-Cluster ist im Yellow-Status. Einige Replikas können nicht zugewiesen werden.', status: 'in_progress' as const, priority: 'medium' as const, impact: 'low' as const, urgency: 'medium' as const, asset_id: assetElasticId, assignee_id: agentId, assignee_group_id: devGroupId, reporter_id: agentId, customer_id: null, category_id: catDatenbankId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'monitoring' as const, created_at: new Date(Date.now() - 6 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: agentId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00012', ticket_type: 'incident' as const, subtype: null, title: 'Outlook-Kalender synchronisiert nicht', description: 'Mehrere Mitarbeiter berichten, dass Outlook-Kalender seit heute Morgen nicht mehr synchronisieren.', status: 'pending' as const, priority: 'medium' as const, impact: 'medium' as const, urgency: 'medium' as const, asset_id: assetMailGwId, assignee_id: agentId, assignee_group_id: supportGroupId, reporter_id: viewerId, customer_id: customerAcmeId, category_id: catApplikationId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'portal' as const, created_at: new Date(Date.now() - 5 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: viewerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00013', ticket_type: 'incident' as const, subtype: null, title: 'GitLab-Runner nicht erreichbar', description: 'Zwei von vier GitLab-Runnern sind offline. CI/CD-Pipelines laufen mit Verzögerung.', status: 'in_progress' as const, priority: 'high' as const, impact: 'medium' as const, urgency: 'high' as const, asset_id: assetGitlabId, assignee_id: managerId, assignee_group_id: devGroupId, reporter_id: managerId, customer_id: null, category_id: catApplikationId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 4 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: managerId },

    // --- Changes ---
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'CHG-2026-00002', ticket_type: 'change' as const, subtype: 'standard', title: 'Kubernetes-Cluster auf v1.30 aktualisieren', description: 'Geplantes Update des Production-K8s-Clusters von v1.29 auf v1.30. Rolling Update, kein Downtime erwartet.', status: 'open' as const, priority: 'medium' as const, impact: 'medium' as const, urgency: 'low' as const, asset_id: assetK8sClusterId, assignee_id: adminId, assignee_group_id: opsGroupId, reporter_id: adminId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: null, sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 2 * d).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'CHG-2026-00003', ticket_type: 'change' as const, subtype: 'normal', title: 'AD-Migration auf neuen Domain Controller', description: 'Migration des Active Directory auf den neuen DC. Alte Gesamtstruktur wird abgelöst.', status: 'pending' as const, priority: 'high' as const, impact: 'high' as const, urgency: 'medium' as const, asset_id: assetAdControllerId, assignee_id: managerId, assignee_group_id: opsGroupId, reporter_id: adminId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: null, sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 5 * d).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'CHG-2026-00004', ticket_type: 'change' as const, subtype: 'emergency', title: 'Notfall-Patch für Log4j-Schwachstelle', description: 'CVE-2024-XXXX betrifft unsere Elasticsearch-Installation. Sofortiger Patch erforderlich.', status: 'in_progress' as const, priority: 'critical' as const, impact: 'high' as const, urgency: 'critical' as const, asset_id: assetElasticId, assignee_id: adminId, assignee_group_id: opsGroupId, reporter_id: adminId, customer_id: null, category_id: catSecurityId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: new Date(Date.now() + 30 * 60 * 1000).toISOString(), sla_resolve_due: new Date(Date.now() + 4 * h).toISOString(), sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 1 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'CHG-2026-00005', ticket_type: 'change' as const, subtype: 'standard', title: 'SAN-Storage Kapazitätserweiterung', description: 'Erweiterung des NetApp SAN um 20TB für wachsenden Backup-Bedarf.', status: 'pending' as const, priority: 'medium' as const, impact: 'low' as const, urgency: 'low' as const, asset_id: assetSanId, assignee_id: null, assignee_group_id: opsGroupId, reporter_id: managerId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: null, sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 7 * d).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: managerId },

    // --- Problems ---
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'PRB-2026-00002', ticket_type: 'problem' as const, subtype: null, title: 'Wiederkehrende DNS-Timeout-Fehler', description: 'Mehrere Dienste berichten sporadisch DNS-Timeouts. Betrifft interne Namensauflösung. Tritt 2-3x pro Woche auf.', status: 'open' as const, priority: 'high' as const, impact: 'medium' as const, urgency: 'high' as const, asset_id: assetDnsId, assignee_id: adminId, assignee_group_id: opsGroupId, reporter_id: agentId, customer_id: null, category_id: catNetzwerkId, workflow_instance_id: null, current_step_id: null, sla_tier: 'platinum', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 14 * d).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: agentId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'PRB-2026-00003', ticket_type: 'problem' as const, subtype: null, title: 'Redis-Cluster Failover-Probleme', description: 'Bei geplanten Wartungsarbeiten failovert der Redis-Cluster nicht korrekt. Sentinel-Konfiguration muss überprüft werden.', status: 'in_progress' as const, priority: 'medium' as const, impact: 'medium' as const, urgency: 'medium' as const, asset_id: assetRedisId, assignee_id: managerId, assignee_group_id: devGroupId, reporter_id: managerId, customer_id: null, category_id: catDatenbankId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 10 * d).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: managerId },

    // --- Resolved / Closed tickets (history) ---
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00014', ticket_type: 'incident' as const, subtype: null, title: 'Drucker im EG druckt Papierstau-Meldung', description: 'Drucker im Erdgeschoss zeigt dauerhaft Papierstau an, obwohl kein Stau vorhanden ist.', status: 'resolved' as const, priority: 'low' as const, impact: 'low' as const, urgency: 'low' as const, asset_id: assetPrinterFloor3Id, assignee_id: agentId, assignee_group_id: supportGroupId, reporter_id: viewerId, customer_id: null, category_id: catArbeitsplatzId, workflow_instance_id: null, current_step_id: null, sla_tier: 'none', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'portal' as const, created_at: new Date(Date.now() - 3 * d).toISOString(), updated_at: new Date(Date.now() - 2 * d).toISOString(), resolved_at: new Date(Date.now() - 2 * d).toISOString(), closed_at: null, created_by: viewerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00015', ticket_type: 'incident' as const, subtype: null, title: 'Notebook startet nicht mehr', description: 'Notebook nb-dev-01 startet nach Windows-Update nicht mehr. Bluescreen beim Booten.', status: 'closed' as const, priority: 'medium' as const, impact: 'low' as const, urgency: 'medium' as const, asset_id: assetLaptop02Id, assignee_id: agentId, assignee_group_id: supportGroupId, reporter_id: viewerId, customer_id: null, category_id: catArbeitsplatzId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 5 * d).toISOString(), updated_at: new Date(Date.now() - 4 * d).toISOString(), resolved_at: new Date(Date.now() - 4 * d).toISOString(), closed_at: new Date(Date.now() - 3 * d).toISOString(), created_by: viewerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00016', ticket_type: 'incident' as const, subtype: null, title: 'VPN-Zertifikat abgelaufen', description: 'Das SSL-Zertifikat für den VPN-Gateway ist abgelaufen. Externe Mitarbeiter können sich nicht verbinden.', status: 'closed' as const, priority: 'critical' as const, impact: 'high' as const, urgency: 'critical' as const, asset_id: assetVpnGwId, assignee_id: adminId, assignee_group_id: opsGroupId, reporter_id: agentId, customer_id: null, category_id: catSecurityId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: null, sla_resolve_due: null, sla_breached: 1, parent_ticket_id: null, source: 'monitoring' as const, created_at: new Date(Date.now() - 8 * d).toISOString(), updated_at: new Date(Date.now() - 7 * d).toISOString(), resolved_at: new Date(Date.now() - 7 * d).toISOString(), closed_at: new Date(Date.now() - 7 * d).toISOString(), created_by: agentId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00017', ticket_type: 'incident' as const, subtype: null, title: 'Backup-Job fehlgeschlagen (Veeam)', description: 'Der nächtliche Backup-Job für die Datenbank-VMs ist mit Fehler "Insufficient disk space" abgebrochen.', status: 'resolved' as const, priority: 'high' as const, impact: 'medium' as const, urgency: 'high' as const, asset_id: assetBackupSrvId, assignee_id: agentId, assignee_group_id: opsGroupId, reporter_id: adminId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'monitoring' as const, created_at: new Date(Date.now() - 4 * d).toISOString(), updated_at: new Date(Date.now() - 3 * d).toISOString(), resolved_at: new Date(Date.now() - 3 * d).toISOString(), closed_at: null, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'CHG-2026-00006', ticket_type: 'change' as const, subtype: 'standard', title: 'SSL-Zertifikate erneuern (Let\'s Encrypt)', description: 'Alle Let\'s Encrypt Zertifikate für externe Services erneuern. Automatisierung via Certbot überprüfen.', status: 'closed' as const, priority: 'medium' as const, impact: 'low' as const, urgency: 'medium' as const, asset_id: assetProxyId, assignee_id: adminId, assignee_group_id: opsGroupId, reporter_id: adminId, customer_id: null, category_id: catSecurityId, workflow_instance_id: null, current_step_id: null, sla_tier: null, sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 12 * d).toISOString(), updated_at: new Date(Date.now() - 10 * d).toISOString(), resolved_at: new Date(Date.now() - 10 * d).toISOString(), closed_at: new Date(Date.now() - 10 * d).toISOString(), created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00018', ticket_type: 'incident' as const, subtype: null, title: 'Salesforce-Integration liefert falsche Daten', description: 'Die ERP-Salesforce-Integration zeigt seit dem letzten Update inkorrekte Kundennummern an.', status: 'in_progress' as const, priority: 'high' as const, impact: 'medium' as const, urgency: 'high' as const, asset_id: assetCrmId, assignee_id: managerId, assignee_group_id: devGroupId, reporter_id: viewerId, customer_id: customerRetailId, category_id: catApplikationId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 1 * d).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: viewerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00019', ticket_type: 'incident' as const, subtype: null, title: 'Prometheus-Alerting sendet keine E-Mails', description: 'Der Alertmanager von Prometheus sendet seit 3 Tagen keine E-Mail-Benachrichtigungen. SMTP-Konfiguration prüfen.', status: 'open' as const, priority: 'high' as const, impact: 'medium' as const, urgency: 'high' as const, asset_id: assetPrometheusId, assignee_id: null, assignee_group_id: opsGroupId, reporter_id: agentId, customer_id: null, category_id: catApplikationId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: new Date(Date.now() + 30 * 60 * 1000).toISOString(), sla_resolve_due: new Date(Date.now() + 4 * h).toISOString(), sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 2 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: agentId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00020', ticket_type: 'incident' as const, subtype: null, title: 'NAS-Speicher zu 95% voll', description: 'Der NAS-Speicher erreicht kritische Auslastung. Alte Daten müssen archiviert oder gelöscht werden.', status: 'open' as const, priority: 'medium' as const, impact: 'low' as const, urgency: 'high' as const, asset_id: assetNasId, assignee_id: agentId, assignee_group_id: opsGroupId, reporter_id: adminId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'monitoring' as const, created_at: new Date(Date.now() - 12 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00021', ticket_type: 'incident' as const, subtype: null, title: 'CEO-Notebook langsam nach Update', description: 'Das Notebook des CEO ist nach dem letzten Windows-Update extrem langsam. Teams-Calls brechen ab.', status: 'in_progress' as const, priority: 'high' as const, impact: 'low' as const, urgency: 'critical' as const, asset_id: assetLaptop01Id, assignee_id: agentId, assignee_group_id: supportGroupId, reporter_id: viewerId, customer_id: null, category_id: catArbeitsplatzId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 6 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: viewerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00022', ticket_type: 'incident' as const, subtype: null, title: 'Diensthandy GPS funktioniert nicht', description: 'Das iPhone des CEOs zeigt keinen GPS-Standort an. MDM-Profil eventuell fehlerhaft.', status: 'pending' as const, priority: 'low' as const, impact: 'low' as const, urgency: 'low' as const, asset_id: assetPhone01Id, assignee_id: agentId, assignee_group_id: supportGroupId, reporter_id: viewerId, customer_id: null, category_id: catArbeitsplatzId, workflow_instance_id: null, current_step_id: null, sla_tier: 'gold', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'portal' as const, created_at: new Date(Date.now() - 2 * d).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: viewerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'CHG-2026-00007', ticket_type: 'change' as const, subtype: 'standard', title: 'GitLab CE auf Version 17.0 aktualisieren', description: 'Planmäßiges Update der GitLab-Instanz auf die neueste Major-Version.', status: 'open' as const, priority: 'medium' as const, impact: 'medium' as const, urgency: 'low' as const, asset_id: assetGitlabId, assignee_id: managerId, assignee_group_id: devGroupId, reporter_id: managerId, customer_id: null, category_id: catApplikationId, workflow_instance_id: null, current_step_id: null, sla_tier: null, sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 3 * d).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: managerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00023', ticket_type: 'incident' as const, subtype: null, title: 'Web-Proxy blockiert interne URLs', description: 'Der Squid-Proxy blockiert seit heute fälschlicherweise interne Confluence-URLs. Whitelist fehlerhaft.', status: 'resolved' as const, priority: 'medium' as const, impact: 'medium' as const, urgency: 'medium' as const, asset_id: assetProxyId, assignee_id: agentId, assignee_group_id: opsGroupId, reporter_id: managerId, customer_id: null, category_id: catNetzwerkId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 1 * d).toISOString(), updated_at: new Date(Date.now() - 18 * h).toISOString(), resolved_at: new Date(Date.now() - 18 * h).toISOString(), closed_at: null, created_by: managerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00024', ticket_type: 'incident' as const, subtype: null, title: 'Jira-Performance extrem langsam', description: 'Jira Cloud reagiert seit 2 Stunden extrem langsam. Atlassian Status-Page zeigt keine Störung.', status: 'open' as const, priority: 'medium' as const, impact: 'medium' as const, urgency: 'medium' as const, asset_id: assetJiraId, assignee_id: null, assignee_group_id: devGroupId, reporter_id: managerId, customer_id: null, category_id: catApplikationId, workflow_instance_id: null, current_step_id: null, sla_tier: 'silver', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 3 * h).toISOString(), updated_at: now, resolved_at: null, closed_at: null, created_by: managerId },
    { id: uuidv4(), tenant_id: tenantId, ticket_number: 'INC-2026-00025', ticket_type: 'incident' as const, subtype: null, title: 'Staging-Server nicht erreichbar', description: 'Der Staging-Application-Server antwortet nicht auf SSH oder HTTP. Vermutlich VM abgestürzt.', status: 'resolved' as const, priority: 'low' as const, impact: 'low' as const, urgency: 'low' as const, asset_id: assetStagingVmId, assignee_id: agentId, assignee_group_id: devGroupId, reporter_id: agentId, customer_id: null, category_id: catServerId, workflow_instance_id: null, current_step_id: null, sla_tier: 'none', sla_response_due: null, sla_resolve_due: null, sla_breached: 0, parent_ticket_id: null, source: 'manual' as const, created_at: new Date(Date.now() - 2 * d).toISOString(), updated_at: new Date(Date.now() - 2 * d + 2 * h).toISOString(), resolved_at: new Date(Date.now() - 2 * d + 2 * h).toISOString(), closed_at: null, created_by: agentId },
  ];

  await db.insert(tickets).values(extendedTickets);
  logger.info(`  ✓ Extended Tickets: ${extendedTickets.length} additional tickets`);

  // Extended comments for various tickets
  await db.insert(ticketComments).values([
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[0]!.id, author_id: managerId, content: 'SAP-Basis-Team kontaktiert. Prüfung der User-Locks läuft.', is_internal: 1, source: 'agent', created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[0]!.id, author_id: adminId, content: 'Es sind 47 User-Accounts betroffen. Ursache: fehlgeschlagener Batch-Job der Passwort-Policy.', is_internal: 1, source: 'agent', created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[3]!.id, author_id: adminId, content: 'Memory-Limits der betroffenen Pods von 512Mi auf 1Gi erhöht. Beobachtung läuft.', is_internal: 1, source: 'agent', created_at: new Date(Date.now() - 2 * h).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[3]!.id, author_id: managerId, content: 'Root Cause: Java-Applikation hat Memory Leak bei hoher Last. Hotfix wird deployed.', is_internal: 1, source: 'agent', created_at: new Date(Date.now() - 1 * h).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[5]!.id, author_id: agentId, content: 'USV-Hersteller kontaktiert. Ersatzbatterien sind auf dem Weg (Lieferung morgen).', is_internal: 0, source: 'agent', created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[11]!.id, author_id: adminId, content: 'Patch erfolgreich auf Staging getestet. Production-Deployment heute Nacht geplant.', is_internal: 1, source: 'agent', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[16]!.id, author_id: agentId, content: 'Veeam-Logs zeigen vollen Deduplications-Store. Alte Restore-Points werden bereinigt.', is_internal: 1, source: 'agent', created_at: new Date(Date.now() - 3 * d + 2 * h).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[19]!.id, author_id: managerId, content: 'Salesforce-Support hat API-Version-Conflict bestätigt. Fix in nächstem Release.', is_internal: 0, source: 'agent', created_at: new Date(Date.now() - 12 * h).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[21]!.id, author_id: agentId, content: 'Windows Update KB5034441 als Ursache identifiziert. Rollback durchgeführt.', is_internal: 1, source: 'agent', created_at: new Date(Date.now() - 4 * h).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[24]!.id, author_id: agentId, content: 'Proxy-Whitelist aktualisiert. Confluence-URLs sind wieder erreichbar.', is_internal: 0, source: 'agent', created_at: new Date(Date.now() - 18 * h).toISOString() },
  ]);
  logger.info('  ✓ Extended Comments: 10 additional comments');

  // Extended history entries
  await db.insert(ticketHistory).values([
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[2]!.id, field_changed: 'status', old_value: 'open', new_value: 'in_progress', changed_by: agentId, changed_at: new Date(Date.now() - 1.5 * h).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[3]!.id, field_changed: 'status', old_value: 'open', new_value: 'in_progress', changed_by: managerId, changed_at: new Date(Date.now() - 2.5 * h).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[3]!.id, field_changed: 'priority', old_value: 'high', new_value: 'critical', changed_by: adminId, changed_at: new Date(Date.now() - 2 * h).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[15]!.id, field_changed: 'status', old_value: 'open', new_value: 'resolved', changed_by: agentId, changed_at: new Date(Date.now() - 4 * d).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[15]!.id, field_changed: 'status', old_value: 'resolved', new_value: 'closed', changed_by: managerId, changed_at: new Date(Date.now() - 3 * d).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[16]!.id, field_changed: 'status', old_value: 'open', new_value: 'closed', changed_by: adminId, changed_at: new Date(Date.now() - 7 * d).toISOString() },
    { id: uuidv4(), tenant_id: tenantId, ticket_id: extendedTickets[16]!.id, field_changed: 'assignee_id', old_value: null, new_value: adminId, changed_by: agentId, changed_at: new Date(Date.now() - 8 * d + 1 * h).toISOString() },
  ]);
  logger.info('  ✓ Extended History: 7 additional history entries');

  // ─── Extended Workflow Templates ─────────────────────────
  const wfProblemMgmtId = uuidv4();
  const wfOnboardingId = uuidv4();
  const wfSecurityIncId = uuidv4();

  await db.insert(workflowTemplates).values([
    {
      id: wfProblemMgmtId,
      tenant_id: tenantId,
      name: 'Problem-Management',
      description: 'Root Cause Analyse und nachhaltige Problembehebung',
      trigger_type: 'ticket_created',
      trigger_subtype: 'problem',
      is_active: 1,
      version: 1,
      created_by: adminId,
      created_at: now,
      updated_at: now,
    },
    {
      id: wfOnboardingId,
      tenant_id: tenantId,
      name: 'Mitarbeiter-Onboarding',
      description: 'IT-Setup für neue Mitarbeiter inkl. Account-Erstellung, Hardware und Zugänge',
      trigger_type: 'manual',
      trigger_subtype: null,
      is_active: 1,
      version: 1,
      created_by: adminId,
      created_at: now,
      updated_at: now,
    },
    {
      id: wfSecurityIncId,
      tenant_id: tenantId,
      name: 'Security Incident Response',
      description: 'Sofortmaßnahmen und Eskalation bei Sicherheitsvorfällen (CERT-Prozess)',
      trigger_type: 'ticket_created',
      trigger_subtype: 'incident',
      is_active: 1,
      version: 1,
      created_by: adminId,
      created_at: now,
      updated_at: now,
    },
  ]);

  // Steps for Problem-Management
  const pmStep1Id = uuidv4();
  const pmStep2Id = uuidv4();
  const pmStep3Id = uuidv4();
  const pmStep4Id = uuidv4();

  await db.insert(workflowSteps).values([
    { id: pmStep1Id, template_id: wfProblemMgmtId, name: 'Problem-Identifikation', step_order: 1, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'affected_services', label: 'Betroffene Services', type: 'text', required: true }, { name: 'incident_count', label: 'Anzahl verknüpfter Incidents', type: 'text', required: true }, { name: 'first_occurrence', label: 'Erstmaliges Auftreten', type: 'text', required: true }] }), timeout_hours: 4, next_step_id: null },
    { id: pmStep2Id, template_id: wfProblemMgmtId, name: 'Root Cause Analyse', step_order: 2, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'root_cause', label: 'Root Cause', type: 'text', required: true }, { name: 'analysis_method', label: 'Analysemethode (5-Why, Ishikawa, etc.)', type: 'text', required: true }, { name: 'evidence', label: 'Beweise/Logs', type: 'text', required: false }] }), timeout_hours: 24, next_step_id: null },
    { id: pmStep3Id, template_id: wfProblemMgmtId, name: 'Lösungsvorschlag genehmigen', step_order: 3, step_type: 'approval', config: JSON.stringify({ approvers: ['manager'], min_approvals: 1, description: 'Genehmigung des Lösungsvorschlags durch das Management' }), timeout_hours: 48, next_step_id: null },
    { id: pmStep4Id, template_id: wfProblemMgmtId, name: 'Workaround/Fix implementieren', step_order: 4, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'fix_description', label: 'Beschreibung der Lösung', type: 'text', required: true }, { name: 'change_ticket', label: 'Verknüpftes Change-Ticket', type: 'text', required: false }, { name: 'verified', label: 'Fix verifiziert?', type: 'text', required: true }] }), timeout_hours: 72, next_step_id: null },
  ]);

  // Steps for Onboarding
  const obStep1Id = uuidv4();
  const obStep2Id = uuidv4();
  const obStep3Id = uuidv4();
  const obStep4Id = uuidv4();
  const obStep5Id = uuidv4();

  await db.insert(workflowSteps).values([
    { id: obStep1Id, template_id: wfOnboardingId, name: 'Personalinfo erfassen', step_order: 1, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'employee_name', label: 'Name des Mitarbeiters', type: 'text', required: true }, { name: 'department', label: 'Abteilung', type: 'text', required: true }, { name: 'start_date', label: 'Startdatum', type: 'text', required: true }, { name: 'role', label: 'Position/Rolle', type: 'text', required: true }] }), timeout_hours: 24, next_step_id: null },
    { id: obStep2Id, template_id: wfOnboardingId, name: 'AD-Account & E-Mail erstellen', step_order: 2, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'username', label: 'Benutzername', type: 'text', required: true }, { name: 'email', label: 'E-Mail-Adresse', type: 'text', required: true }, { name: 'groups', label: 'AD-Gruppen', type: 'text', required: true }] }), timeout_hours: 8, next_step_id: null },
    { id: obStep3Id, template_id: wfOnboardingId, name: 'Hardware bestellen', step_order: 3, step_type: 'routing', config: JSON.stringify({ options: [{ label: 'Laptop (Standard)', next_step_id: null }, { label: 'Laptop (Entwickler)', next_step_id: null }, { label: 'Desktop-Arbeitsplatz', next_step_id: null }] }), timeout_hours: 48, next_step_id: null },
    { id: obStep4Id, template_id: wfOnboardingId, name: 'Software & Lizenzen', step_order: 4, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'software_list', label: 'Benötigte Software', type: 'text', required: true }, { name: 'vpn_access', label: 'VPN-Zugang benötigt?', type: 'text', required: true }, { name: 'special_access', label: 'Sonderzugänge', type: 'text', required: false }] }), timeout_hours: 24, next_step_id: null },
    { id: obStep5Id, template_id: wfOnboardingId, name: 'Manager-Freigabe', step_order: 5, step_type: 'approval', config: JSON.stringify({ approvers: ['manager'], min_approvals: 1, description: 'Bestätigung dass alle Zugänge eingerichtet sind' }), timeout_hours: 24, next_step_id: null },
  ]);

  // Steps for Security Incident Response
  const siStep1Id = uuidv4();
  const siStep2Id = uuidv4();
  const siStep3Id = uuidv4();
  const siStep4Id = uuidv4();

  await db.insert(workflowSteps).values([
    { id: siStep1Id, template_id: wfSecurityIncId, name: 'Bedrohungsbewertung', step_order: 1, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'threat_type', label: 'Art der Bedrohung', type: 'text', required: true }, { name: 'affected_systems', label: 'Betroffene Systeme', type: 'text', required: true }, { name: 'data_breach', label: 'Datenverlust möglich?', type: 'text', required: true }, { name: 'severity', label: 'Schweregrad (P1-P4)', type: 'text', required: true }] }), timeout_hours: 1, next_step_id: null },
    { id: siStep2Id, template_id: wfSecurityIncId, name: 'Sofortmaßnahmen', step_order: 2, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'containment', label: 'Eindämmungsmaßnahmen', type: 'text', required: true }, { name: 'isolation', label: 'System isoliert?', type: 'text', required: true }, { name: 'evidence_preserved', label: 'Beweise gesichert?', type: 'text', required: true }] }), timeout_hours: 2, next_step_id: null },
    { id: siStep3Id, template_id: wfSecurityIncId, name: 'CISO-Eskalation', step_order: 3, step_type: 'approval', config: JSON.stringify({ approvers: ['admin'], min_approvals: 1, description: 'CISO muss bei Datenverlust innerhalb 72h die Behörden informieren (DSGVO Art. 33)' }), timeout_hours: 4, next_step_id: null },
    { id: siStep4Id, template_id: wfSecurityIncId, name: 'Post-Incident Report', step_order: 4, step_type: 'form', config: JSON.stringify({ fields: [{ name: 'timeline', label: 'Zeitstrahl des Vorfalls', type: 'text', required: true }, { name: 'root_cause', label: 'Root Cause', type: 'text', required: true }, { name: 'lessons_learned', label: 'Lessons Learned', type: 'text', required: true }, { name: 'preventive_measures', label: 'Präventivmaßnahmen', type: 'text', required: true }] }), timeout_hours: 168, next_step_id: null },
  ]);
  logger.info('  ✓ Extended Workflows: 3 templates (Problem-Mgmt, Onboarding, Security IR) + 13 steps');

  // ─── Workflow Instances (running on tickets) ──────────────
  const wiProblem1Id = uuidv4();
  const prbTicketId = extendedTickets[13]!.id; // PRB-2026-00002

  await db.insert(workflowInstances).values({
    id: wiProblem1Id,
    tenant_id: tenantId,
    template_id: wfProblemMgmtId,
    ticket_id: prbTicketId,
    status: 'active',
    started_at: new Date(Date.now() - 14 * d).toISOString(),
    completed_at: null,
  });

  await db.insert(workflowStepInstances).values([
    { id: uuidv4(), instance_id: wiProblem1Id, step_id: pmStep1Id, status: 'completed', assigned_to: agentId, assigned_group: opsGroupId, form_data: JSON.stringify({ affected_services: 'DNS, AD, E-Mail (abhängig)', incident_count: '7', first_occurrence: '2026-02-24' }), started_at: new Date(Date.now() - 14 * d).toISOString(), completed_at: new Date(Date.now() - 13 * d).toISOString(), completed_by: agentId },
    { id: uuidv4(), instance_id: wiProblem1Id, step_id: pmStep2Id, status: 'in_progress', assigned_to: adminId, assigned_group: opsGroupId, form_data: '{}', started_at: new Date(Date.now() - 13 * d).toISOString(), completed_at: null, completed_by: null },
    { id: uuidv4(), instance_id: wiProblem1Id, step_id: pmStep3Id, status: 'pending', assigned_to: null, assigned_group: null, form_data: '{}', started_at: null, completed_at: null, completed_by: null },
    { id: uuidv4(), instance_id: wiProblem1Id, step_id: pmStep4Id, status: 'pending', assigned_to: null, assigned_group: null, form_data: '{}', started_at: null, completed_at: null, completed_by: null },
  ]);

  const wiSecurityId = uuidv4();
  const secTicketId = extendedTickets[11]!.id; // CHG-2026-00004 (Log4j)

  await db.insert(workflowInstances).values({
    id: wiSecurityId,
    tenant_id: tenantId,
    template_id: wfSecurityIncId,
    ticket_id: secTicketId,
    status: 'active',
    started_at: new Date(Date.now() - 1 * h).toISOString(),
    completed_at: null,
  });

  await db.insert(workflowStepInstances).values([
    { id: uuidv4(), instance_id: wiSecurityId, step_id: siStep1Id, status: 'completed', assigned_to: adminId, assigned_group: opsGroupId, form_data: JSON.stringify({ threat_type: 'CVE / Remote Code Execution', affected_systems: 'Elasticsearch Cluster (3 Nodes)', data_breach: 'Nein — keine externen Zugriffe festgestellt', severity: 'P1' }), started_at: new Date(Date.now() - 1 * h).toISOString(), completed_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(), completed_by: adminId },
    { id: uuidv4(), instance_id: wiSecurityId, step_id: siStep2Id, status: 'in_progress', assigned_to: adminId, assigned_group: opsGroupId, form_data: '{}', started_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(), completed_at: null, completed_by: null },
    { id: uuidv4(), instance_id: wiSecurityId, step_id: siStep3Id, status: 'pending', assigned_to: null, assigned_group: null, form_data: '{}', started_at: null, completed_at: null, completed_by: null },
    { id: uuidv4(), instance_id: wiSecurityId, step_id: siStep4Id, status: 'pending', assigned_to: null, assigned_group: null, form_data: '{}', started_at: null, completed_at: null, completed_by: null },
  ]);

  // Update tickets to reference their workflow instances
  await db.update(tickets).set({ workflow_instance_id: wiProblem1Id }).where(eq(tickets.id, prbTicketId));
  await db.update(tickets).set({ workflow_instance_id: wiSecurityId }).where(eq(tickets.id, secTicketId));

  logger.info('  ✓ Workflow Instances: 2 active (Problem-Mgmt on DNS-Problem, Security IR on Log4j-Patch)');

  // ─── SLA Definitions ──────────────────────────────────────
  const slaGoldId = uuidv4();
  const slaSilverId = uuidv4();
  const slaBronzeId = uuidv4();

  await db.insert(slaDefinitions).values([
    {
      id: slaGoldId,
      tenant_id: tenantId,
      name: 'Gold SLA',
      description: 'Premium-SLA für geschäftskritische Systeme. 24/7 Erreichbarkeit.',
      response_time_minutes: 30,
      resolution_time_minutes: 240,
      business_hours: '24/7',
      business_hours_start: null,
      business_hours_end: null,
      business_days: '1,2,3,4,5,6,7',
      priority_overrides: '{}',
      availability_pct: '99.9',
      support_level: '24x7',
      recovery_class: 'Tier 1',
      business_criticality: 'high',
      penalty_clause: 'Bei Unterschreitung der vereinbarten Verfügbarkeit von 99,9% wird eine Gutschrift von 10% der monatlichen Servicegebühr pro 0,1% Unterschreitung gewährt.',
      contract_reference: 'SLA-GOLD-2025-001',
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      is_default: 0,
      is_active: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: slaSilverId,
      tenant_id: tenantId,
      name: 'Silver SLA',
      description: 'Standard-SLA für wichtige Systeme. Erweiterte Geschäftszeiten.',
      response_time_minutes: 60,
      resolution_time_minutes: 480,
      business_hours: 'extended',
      business_hours_start: '07:00',
      business_hours_end: '20:00',
      business_days: '1,2,3,4,5',
      priority_overrides: '{}',
      availability_pct: '99.5',
      support_level: '8x5',
      recovery_class: 'Tier 2',
      business_criticality: 'medium',
      penalty_clause: null,
      contract_reference: 'SLA-SILVER-2025-001',
      valid_from: '2025-01-01',
      valid_until: '2025-12-31',
      is_default: 1,
      is_active: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: slaBronzeId,
      tenant_id: tenantId,
      name: 'Bronze SLA',
      description: 'Basis-SLA für unkritische Systeme. Reguläre Geschäftszeiten.',
      response_time_minutes: 120,
      resolution_time_minutes: 1440,
      business_hours: 'business',
      business_hours_start: '08:00',
      business_hours_end: '17:00',
      business_days: '1,2,3,4,5',
      priority_overrides: '{}',
      availability_pct: '99.0',
      support_level: 'best-effort',
      recovery_class: 'Tier 3',
      business_criticality: 'low',
      penalty_clause: null,
      contract_reference: null,
      valid_from: '2025-01-01',
      valid_until: null,
      is_default: 0,
      is_active: 1,
      created_at: now,
      updated_at: now,
    },
  ]);
  logger.info('  ✓ SLA Definitions: Gold, Silver (default), Bronze');

  // ─── SLA Assignments ──────────────────────────────────────
  await db.insert(slaAssignments).values([
    {
      id: uuidv4(),
      tenant_id: tenantId,
      sla_definition_id: slaGoldId,
      service_id: svcDatabaseId,
      customer_id: null,
      asset_id: null,
      priority: 25,
      created_at: now,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      sla_definition_id: slaGoldId,
      service_id: null,
      customer_id: customerAcmeId,
      asset_id: null,
      priority: 50,
      created_at: now,
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      sla_definition_id: slaBronzeId,
      service_id: svcWorkplaceId,
      customer_id: null,
      asset_id: null,
      priority: 25,
      created_at: now,
    },
  ]);
  logger.info('  ✓ SLA Assignments: 3 assignments (DB→Gold, Acme→Gold, Workplace→Bronze)');

  // Extended SLA assignments for additional customers and assets
  await db.insert(slaAssignments).values([
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaGoldId, service_id: null, customer_id: customerBankId, asset_id: null, priority: 50, created_at: now },
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaSilverId, service_id: null, customer_id: customerLogistikId, asset_id: null, priority: 50, created_at: now },
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaSilverId, service_id: null, customer_id: customerRetailId, asset_id: null, priority: 50, created_at: now },
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaGoldId, service_id: null, customer_id: customerEnergieId, asset_id: null, priority: 50, created_at: now },
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaGoldId, service_id: null, customer_id: null, asset_id: assetK8sClusterId, priority: 100, created_at: now },
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaGoldId, service_id: null, customer_id: null, asset_id: assetErpId, priority: 100, created_at: now },
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaGoldId, service_id: svcEmailId, customer_id: null, asset_id: null, priority: 25, created_at: now },
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaSilverId, service_id: svcWebHostingId, customer_id: null, asset_id: null, priority: 25, created_at: now },
    { id: uuidv4(), tenant_id: tenantId, sla_definition_id: slaGoldId, service_id: svcMonitoringId, customer_id: customerBankId, asset_id: null, priority: 75, created_at: now },
  ]);
  logger.info('  ✓ Extended SLA Assignments: 9 additional assignments');

  // ─── Projects (Evo-2C) ──────────────────────────────────────
  const projDcMigrationId = uuidv4();
  const projSecHardeningId = uuidv4();
  const projErpRolloutId = uuidv4();

  await db.insert(projects).values([
    {
      id: projDcMigrationId,
      tenant_id: tenantId,
      customer_id: null,
      name: 'DC Migration 2025',
      code: 'PROJ-DC-2025',
      description: 'Migration des primären Rechenzentrums von Frankfurt nach München. Umzug aller physischen Server und Netzwerkkomponenten.',
      status: 'active',
      start_date: '2025-01-15',
      end_date: '2025-12-31',
      created_at: daysAgo(90),
      updated_at: now,
    },
    {
      id: projSecHardeningId,
      tenant_id: tenantId,
      customer_id: customerBankId,
      name: 'Security Hardening Q1',
      code: 'PROJ-SEC-Q1',
      description: 'Härtung aller produktiven Systeme gemäß BSI IT-Grundschutz Anforderungen für BayernBank.',
      status: 'active',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      created_at: daysAgo(70),
      updated_at: now,
    },
    {
      id: projErpRolloutId,
      tenant_id: tenantId,
      customer_id: customerBankId,
      name: 'ERP Rollout BayernBank',
      code: 'PROJ-ERP-BB',
      description: 'Einführung SAP S/4HANA für BayernBank AG inklusive Datenmigration und Schulung.',
      status: 'planning',
      start_date: '2026-04-01',
      end_date: '2026-09-30',
      created_at: daysAgo(14),
      updated_at: now,
    },
  ]);

  // Project Assets
  await db.insert(projectAssets).values([
    { project_id: projDcMigrationId, asset_id: assetRackId, tenant_id: tenantId, role: 'migration_target', added_at: daysAgo(90) },
    { project_id: projDcMigrationId, asset_id: assetEsxi01Id, tenant_id: tenantId, role: 'migration_target', added_at: daysAgo(90) },
    { project_id: projDcMigrationId, asset_id: assetEsxi02Id, tenant_id: tenantId, role: 'migration_target', added_at: daysAgo(90) },
    { project_id: projDcMigrationId, asset_id: assetSanId, tenant_id: tenantId, role: 'migration_target', added_at: daysAgo(85) },
    { project_id: projSecHardeningId, asset_id: assetFwId, tenant_id: tenantId, role: 'hardening_target', added_at: daysAgo(70) },
    { project_id: projSecHardeningId, asset_id: assetAdControllerId, tenant_id: tenantId, role: 'hardening_target', added_at: daysAgo(70) },
    { project_id: projSecHardeningId, asset_id: assetDnsId, tenant_id: tenantId, role: 'hardening_target', added_at: daysAgo(65) },
    { project_id: projSecHardeningId, asset_id: assetVpnGwId, tenant_id: tenantId, role: 'hardening_target', added_at: daysAgo(60) },
    { project_id: projErpRolloutId, asset_id: assetErpId, tenant_id: tenantId, role: 'primary_system', added_at: daysAgo(14) },
    { project_id: projErpRolloutId, asset_id: assetDb01Id, tenant_id: tenantId, role: 'database_backend', added_at: daysAgo(14) },
  ]);
  logger.info('  ✓ Projects: 3 projects with 10 asset links');

  // ─── Compliance Controls (Evo-4A) ─────────────────────────
  const ctrlAccessMgmtId = uuidv4();
  const ctrlEncryptionId = uuidv4();
  const ctrlBackupId = uuidv4();
  const ctrlIncidentResponseId = uuidv4();
  const ctrlMonitoringId = uuidv4();
  const ctrlPatchMgmtId = uuidv4();
  const ctrlNetworkSegId = uuidv4();
  const ctrlEndpointProtId = uuidv4();
  const ctrlDpiaId = uuidv4();
  const ctrlBreachNotifId = uuidv4();
  const ctrlAssetInventoryId = uuidv4();
  const ctrlChangeCtrlId = uuidv4();

  await db.insert(complianceControls).values([
    { id: ctrlAccessMgmtId, tenant_id: tenantId, code: 'CTRL-001', title: 'Zugriffskontrolle & Berechtigungsmanagement', description: 'RBAC-basierte Zugriffskontrolle für alle Systeme. PAM für privilegierte Accounts. Regelmäßige Rezertifizierung.', category: 'Zugriffskontrolle', control_type: 'preventive', status: 'implemented', owner_id: adminId, created_at: daysAgo(180), updated_at: daysAgo(30) },
    { id: ctrlEncryptionId, tenant_id: tenantId, code: 'CTRL-002', title: 'Verschlüsselung (at-rest & in-transit)', description: 'AES-256 für Daten at-rest, TLS 1.3 für Daten in-transit. Zertifikatsmanagement über interne CA.', category: 'Kryptographie', control_type: 'preventive', status: 'implemented', owner_id: adminId, created_at: daysAgo(180), updated_at: daysAgo(15) },
    { id: ctrlBackupId, tenant_id: tenantId, code: 'CTRL-003', title: 'Datensicherung & Recovery', description: 'Tägliche inkrementelle Backups, wöchentliche Vollsicherung. Monatliche Restore-Tests. RPO: 24h, RTO: 4h.', category: 'Business Continuity', control_type: 'corrective', status: 'verified', owner_id: managerId, created_at: daysAgo(180), updated_at: daysAgo(7) },
    { id: ctrlIncidentResponseId, tenant_id: tenantId, code: 'CTRL-004', title: 'Incident-Response-Prozess', description: 'Definierter IR-Prozess mit Eskalationsstufen, Kommunikationsplan und 72h-Meldefrist an Aufsichtsbehörde.', category: 'Incident Management', control_type: 'corrective', status: 'implemented', owner_id: managerId, created_at: daysAgo(120), updated_at: daysAgo(20) },
    { id: ctrlMonitoringId, tenant_id: tenantId, code: 'CTRL-005', title: 'Systemüberwachung & Logging', description: 'Zentrales Monitoring via Checkmk + Prometheus. Syslog-Aggregation via Elasticsearch. Anomalie-Erkennung aktiv.', category: 'Überwachung', control_type: 'detective', status: 'implemented', owner_id: adminId, created_at: daysAgo(150), updated_at: daysAgo(5) },
    { id: ctrlPatchMgmtId, tenant_id: tenantId, code: 'CTRL-006', title: 'Patch-Management', description: 'Monatlicher Patch-Zyklus. Kritische Patches innerhalb 72h. Patch-Compliance-Report für alle Systeme.', category: 'Systemhärtung', control_type: 'preventive', status: 'implemented', owner_id: managerId, created_at: daysAgo(150), updated_at: daysAgo(10) },
    { id: ctrlNetworkSegId, tenant_id: tenantId, code: 'CTRL-007', title: 'Netzwerksegmentierung', description: 'VLANs für Produktion, Management, DMZ und Gäste. Firewall-Regeln zwischen Segmenten.', category: 'Netzwerksicherheit', control_type: 'preventive', status: 'verified', owner_id: adminId, created_at: daysAgo(200), updated_at: daysAgo(30) },
    { id: ctrlEndpointProtId, tenant_id: tenantId, code: 'CTRL-008', title: 'Endpoint Protection', description: 'Antivirus + EDR auf allen Endgeräten. Application Whitelisting auf Servern. USB-Kontrolle.', category: 'Endgerätesicherheit', control_type: 'preventive', status: 'planned', owner_id: managerId, created_at: daysAgo(60), updated_at: daysAgo(5) },
    { id: ctrlDpiaId, tenant_id: tenantId, code: 'CTRL-009', title: 'Datenschutz-Folgenabschätzung (DSFA)', description: 'Durchführung von DSFA für alle Verarbeitungstätigkeiten mit hohem Risiko gemäß Art. 35 DSGVO.', category: 'Datenschutz', control_type: 'preventive', status: 'implemented', owner_id: adminId, created_at: daysAgo(100), updated_at: daysAgo(25) },
    { id: ctrlBreachNotifId, tenant_id: tenantId, code: 'CTRL-010', title: 'Meldeprozess Datenschutzverletzungen', description: 'Prozess zur Meldung von Datenschutzverletzungen an Aufsichtsbehörde binnen 72h gemäß Art. 33 DSGVO.', category: 'Datenschutz', control_type: 'corrective', status: 'implemented', owner_id: managerId, created_at: daysAgo(100), updated_at: daysAgo(20) },
    { id: ctrlAssetInventoryId, tenant_id: tenantId, code: 'CTRL-011', title: 'Asset-Inventarisierung', description: 'Vollständiges CMDB mit automatischer Discovery. Quartalsweise Inventur. Verantwortliche pro Asset.', category: 'Asset Management', control_type: 'detective', status: 'verified', owner_id: adminId, created_at: daysAgo(200), updated_at: daysAgo(3) },
    { id: ctrlChangeCtrlId, tenant_id: tenantId, code: 'CTRL-012', title: 'Change-Management-Prozess', description: 'Formaler Change-Prozess mit CAB-Genehmigung, Rollback-Plan und Post-Implementation-Review.', category: 'Change Management', control_type: 'preventive', status: 'implemented', owner_id: managerId, created_at: daysAgo(180), updated_at: daysAgo(10) },
  ]);
  logger.info('  ✓ Compliance Controls: 12 controls');

  // Requirement → Control Mappings
  await db.insert(requirementControlMappings).values([
    { requirement_id: reqA5_1Id, control_id: ctrlAccessMgmtId, tenant_id: tenantId, coverage: 'full', notes: 'ISMS-Richtlinie definiert Zugriffskontrollen' },
    { requirement_id: reqA8_1Id, control_id: ctrlEndpointProtId, tenant_id: tenantId, coverage: 'partial', notes: 'EDR-Rollout noch in Planung' },
    { requirement_id: reqA8_2Id, control_id: ctrlAccessMgmtId, tenant_id: tenantId, coverage: 'full', notes: 'PAM für alle privilegierten Accounts' },
    { requirement_id: reqA8_3Id, control_id: ctrlAccessMgmtId, tenant_id: tenantId, coverage: 'full', notes: 'RBAC + Least Privilege' },
    { requirement_id: reqA12_1Id, control_id: ctrlBackupId, tenant_id: tenantId, coverage: 'full', notes: 'Tägliche Backups + monatliche Restore-Tests' },
    { requirement_id: reqA12_3Id, control_id: ctrlMonitoringId, tenant_id: tenantId, coverage: 'full', notes: 'Checkmk + Prometheus mit Alerting' },
    { requirement_id: reqDsgvo32Id, control_id: ctrlEncryptionId, tenant_id: tenantId, coverage: 'full', notes: 'AES-256 at-rest, TLS 1.3 in-transit' },
    { requirement_id: reqDsgvo32Id, control_id: ctrlNetworkSegId, tenant_id: tenantId, coverage: 'full', notes: 'Netzwerksegmentierung als TOM' },
    { requirement_id: reqDsgvo33Id, control_id: ctrlBreachNotifId, tenant_id: tenantId, coverage: 'full', notes: '72h-Meldeprozess definiert' },
    { requirement_id: reqDsgvo33Id, control_id: ctrlIncidentResponseId, tenant_id: tenantId, coverage: 'full', notes: 'IR-Plan inkl. Meldekette' },
    { requirement_id: reqDsgvo35Id, control_id: ctrlDpiaId, tenant_id: tenantId, coverage: 'full', notes: 'DSFA-Prozess für Hochrisiko-Verarbeitungen' },
    { requirement_id: reqDsgvo25Id, control_id: ctrlEncryptionId, tenant_id: tenantId, coverage: 'partial', notes: 'Privacy by Design — Verschlüsselung' },
    { requirement_id: reqA5_2Id, control_id: ctrlAssetInventoryId, tenant_id: tenantId, coverage: 'full', notes: 'Asset-Owner in CMDB definiert' },
    { requirement_id: reqA6_1Id, control_id: ctrlAccessMgmtId, tenant_id: tenantId, coverage: 'partial', notes: 'Screening vor Zugriffsvergabe' },
  ]);
  logger.info('  ✓ Requirement-Control Mappings: 14 mappings');

  // ─── Compliance Audits (Evo-4B) ───────────────────────────
  const auditIso2024Id = uuidv4();
  const auditDsgvo2025Id = uuidv4();
  const auditBsiId = uuidv4();

  await db.insert(complianceAudits).values([
    { id: auditIso2024Id, tenant_id: tenantId, name: 'ISO 27001 Rezertifizierung 2024', framework_id: fwIso27001Id, audit_type: 'certification', status: 'completed', auditor: 'TÜV Süd — Dr. Klaus Weber', start_date: '2024-09-15', end_date: '2024-10-10', scope: 'Gesamtes ISMS inkl. RZ Frankfurt', notes: 'Rezertifizierung erfolgreich. 2 Minor Findings, 1 Observation.', created_at: daysAgo(180), updated_at: daysAgo(150) },
    { id: auditDsgvo2025Id, tenant_id: tenantId, name: 'DSGVO Compliance Review Q1/2026', framework_id: fwDsgvoId, audit_type: 'internal', status: 'in_progress', auditor: 'Maria Manager (DSB)', start_date: '2026-02-01', end_date: null, scope: 'Alle Verarbeitungstätigkeiten mit personenbezogenen Daten', notes: 'Internes Review der DSGVO-Konformität.', created_at: daysAgo(40), updated_at: daysAgo(2) },
    { id: auditBsiId, tenant_id: tenantId, name: 'BSI IT-Grundschutz Basis-Check', framework_id: fwIso27001Id, audit_type: 'external', status: 'planned', auditor: 'datenschutz-nord GmbH', start_date: '2026-06-01', end_date: '2026-06-30', scope: 'Kritische Infrastruktur: RZ, Netzwerk, Datenbanken', notes: null, created_at: daysAgo(7), updated_at: daysAgo(7) },
  ]);

  // Audit Findings
  await db.insert(auditFindings).values([
    { id: uuidv4(), audit_id: auditIso2024Id, tenant_id: tenantId, control_id: ctrlPatchMgmtId, requirement_id: reqA8_1Id, severity: 'minor', title: 'Patch-Compliance unter Zielwert', description: 'Patch-Compliance-Rate liegt bei 87% statt der geforderten 95%. Insbesondere Legacy-Systeme betroffen.', status: 'in_remediation', remediation_plan: 'Automatisiertes Patching via Ansible bis Q2/2025. Legacy-Systeme in separates VLAN isoliert.', due_date: '2025-06-30', resolved_at: null, resolved_by: null, created_at: daysAgo(150), updated_at: daysAgo(30) },
    { id: uuidv4(), audit_id: auditIso2024Id, tenant_id: tenantId, control_id: ctrlEndpointProtId, requirement_id: reqA8_1Id, severity: 'minor', title: 'Endpoint Protection nicht flächendeckend', description: 'EDR-Agent fehlt auf 12 von 230 Endgeräten (5.2%). Hauptsächlich BYOD-Geräte.', status: 'resolved', remediation_plan: 'BYOD-Policy verschärft. NAC implementiert.', due_date: '2025-03-31', resolved_at: daysAgo(60), resolved_by: adminId, created_at: daysAgo(150), updated_at: daysAgo(60) },
    { id: uuidv4(), audit_id: auditIso2024Id, tenant_id: tenantId, control_id: null, requirement_id: reqA5_2Id, severity: 'observation', title: 'Rollen-Dokumentation unvollständig', description: 'Sicherheitsrollen sind definiert, aber die Dokumentation der Verantwortlichkeitsmatrix ist veraltet.', status: 'resolved', remediation_plan: 'RACI-Matrix aktualisiert und im Wiki veröffentlicht.', due_date: '2025-01-31', resolved_at: daysAgo(120), resolved_by: managerId, created_at: daysAgo(150), updated_at: daysAgo(120) },
    { id: uuidv4(), audit_id: auditDsgvo2025Id, tenant_id: tenantId, control_id: ctrlDpiaId, requirement_id: reqDsgvo35Id, severity: 'major', title: 'DSFA für HR-System ausstehend', description: 'Für das HR-System mit umfangreicher Mitarbeiterdatenverarbeitung wurde noch keine DSFA durchgeführt.', status: 'open', remediation_plan: null, due_date: '2026-04-30', resolved_at: null, resolved_by: null, created_at: daysAgo(10), updated_at: daysAgo(10) },
    { id: uuidv4(), audit_id: auditDsgvo2025Id, tenant_id: tenantId, control_id: ctrlBreachNotifId, requirement_id: reqDsgvo30Id, severity: 'minor', title: 'Verarbeitungsverzeichnis unvollständig', description: 'Das Verzeichnis der Verarbeitungstätigkeiten enthält nicht alle Cloud-Dienste (SaaS).', status: 'in_remediation', remediation_plan: 'Inventarisierung aller SaaS-Dienste läuft. Verzeichnis wird bis Ende März ergänzt.', due_date: '2026-03-31', resolved_at: null, resolved_by: null, created_at: daysAgo(10), updated_at: daysAgo(3) },
  ]);
  logger.info('  ✓ Compliance Audits: 3 audits + 5 findings');

  // ─── Compliance Evidence (Evo-4C) ─────────────────────────
  await db.insert(complianceEvidence).values([
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlAccessMgmtId, evidence_type: 'document', title: 'ISMS-Richtlinie v2.1', url: 'https://wiki.internal/isms/access-policy-v2.1.pdf', description: 'Aktuelle Zugriffskontrollrichtlinie, genehmigt am 15.01.2025.', uploaded_at: daysAgo(60), uploaded_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlBackupId, evidence_type: 'report', title: 'Backup Restore-Test Dezember 2025', url: 'https://wiki.internal/backup/restore-test-2025-12.pdf', description: 'Monatlicher Restore-Test: 100% Erfolgsquote, RTO eingehalten (3h42m vs. 4h Ziel).', uploaded_at: daysAgo(90), uploaded_by: managerId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlMonitoringId, evidence_type: 'screenshot', title: 'Checkmk Dashboard — Produktionssysteme', url: 'https://monitoring.internal/screenshot-prod-2026-03.png', description: 'Screenshot des Monitoring-Dashboards mit Uptime > 99.9%.', uploaded_at: daysAgo(5), uploaded_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlNetworkSegId, evidence_type: 'document', title: 'Netzwerkplan mit VLAN-Segmentierung', url: 'https://wiki.internal/network/vlan-plan-v3.pdf', description: 'Aktueller Netzwerkplan mit allen VLANs und Firewall-Regeln zwischen Segmenten.', uploaded_at: daysAgo(30), uploaded_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlEncryptionId, evidence_type: 'test_result', title: 'TLS-Scan Ergebnis März 2026', url: 'https://wiki.internal/security/tls-scan-2026-03.html', description: 'Qualys SSL Labs Scan: A+ Rating für alle externen Endpoints.', uploaded_at: daysAgo(3), uploaded_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlChangeCtrlId, evidence_type: 'log', title: 'Change-Management Audit Trail Q4/2025', url: 'https://wiki.internal/change/audit-trail-q4-2025.csv', description: 'Export aller genehmigten Changes aus Q4/2025 mit CAB-Protokollen.', uploaded_at: daysAgo(45), uploaded_by: managerId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlDpiaId, evidence_type: 'document', title: 'DSFA-Vorlage und Prozessbeschreibung', url: 'https://wiki.internal/privacy/dsfa-template-v1.pdf', description: 'Standardisierte Vorlage für Datenschutz-Folgenabschätzungen mit Risikobewertungsmatrix.', uploaded_at: daysAgo(40), uploaded_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlBreachNotifId, evidence_type: 'document', title: 'Meldeprozess Datenschutzverletzungen v1.2', url: 'https://wiki.internal/privacy/breach-notification-process.pdf', description: 'Prozessdokumentation für die Meldung von Datenschutzverletzungen inkl. Meldekette und Formulare.', uploaded_at: daysAgo(35), uploaded_by: managerId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlIncidentResponseId, evidence_type: 'report', title: 'Incident Response Übung Februar 2026', url: 'https://wiki.internal/security/ir-exercise-2026-02.pdf', description: 'Bericht der IR-Tabletop-Übung: Ransomware-Szenario. Reaktionszeit innerhalb SLA, 2 Verbesserungsmaßnahmen identifiziert.', uploaded_at: daysAgo(15), uploaded_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, control_id: ctrlAssetInventoryId, evidence_type: 'screenshot', title: 'CMDB Asset-Übersicht März 2026', url: 'https://cmdb.internal/screenshot-asset-overview-2026-03.png', description: 'Screenshot der vollständigen Asset-Inventar-Übersicht mit 100% Erfassungsquote.', uploaded_at: daysAgo(2), uploaded_by: adminId },
  ]);
  logger.info('  ✓ Compliance Evidence: 10 evidence items');

  // ─── Cross-Framework Requirement Mappings (Evo-4D: REQ-4.1) ──
  await db.insert(frameworkRequirementMappings).values([
    // ISO 27001 A.5.1 (Security policies) ↔ DSGVO Art. 5 (Processing principles)
    { id: uuidv4(), tenant_id: tenantId, source_requirement_id: reqA5_1Id, target_requirement_id: reqDsgvo5Id, mapping_type: 'related', notes: 'Beide fordern übergeordnete Richtlinien für den Umgang mit (personenbezogenen) Daten.', created_by: adminId, created_at: daysAgo(90) },
    // ISO 27001 A.8.2 (Privileged access) ↔ DSGVO Art. 32 (Security of processing)
    { id: uuidv4(), tenant_id: tenantId, source_requirement_id: reqA8_2Id, target_requirement_id: reqDsgvo32Id, mapping_type: 'partial', notes: 'PAM-Kontrollen erfüllen teilweise die TOM-Anforderungen aus Art. 32 (Zugriffssteuerung).', created_by: adminId, created_at: daysAgo(85) },
    // ISO 27001 A.8.3 (Information access restriction) ↔ DSGVO Art. 25 (Privacy by Design)
    { id: uuidv4(), tenant_id: tenantId, source_requirement_id: reqA8_3Id, target_requirement_id: reqDsgvo25Id, mapping_type: 'partial', notes: 'Need-to-know-Prinzip unterstützt Datenminimierung und Privacy by Design.', created_by: adminId, created_at: daysAgo(80) },
    // ISO 27001 A.8.13 (Backup) ↔ DSGVO Art. 32 (Security of processing)
    { id: uuidv4(), tenant_id: tenantId, source_requirement_id: reqA12_1Id, target_requirement_id: reqDsgvo32Id, mapping_type: 'partial', notes: 'Datensicherung als technische Maßnahme zur Gewährleistung der Verfügbarkeit (Art. 32 Abs. 1 lit. b).', created_by: adminId, created_at: daysAgo(75) },
    // ISO 27001 A.8.16 (Monitoring) ↔ DSGVO Art. 33 (Breach notification)
    { id: uuidv4(), tenant_id: tenantId, source_requirement_id: reqA12_3Id, target_requirement_id: reqDsgvo33Id, mapping_type: 'related', notes: 'Monitoring-Aktivitäten ermöglichen die rechtzeitige Erkennung und Meldung von Datenschutzverletzungen.', created_by: adminId, created_at: daysAgo(70) },
    // ISO 27001 A.5.2 (Roles and responsibilities) ↔ DSGVO Art. 30 (Records of processing)
    { id: uuidv4(), tenant_id: tenantId, source_requirement_id: reqA5_2Id, target_requirement_id: reqDsgvo30Id, mapping_type: 'related', notes: 'Klare Rollen und Verantwortlichkeiten sind Voraussetzung für ein vollständiges Verarbeitungsverzeichnis.', created_by: adminId, created_at: daysAgo(65) },
    // ISO 27001 A.8.1 (User endpoint devices) ↔ DSGVO Art. 32 (Security of processing)
    { id: uuidv4(), tenant_id: tenantId, source_requirement_id: reqA8_1Id, target_requirement_id: reqDsgvo32Id, mapping_type: 'partial', notes: 'Endgeräteschutz als TOM gemäß Art. 32 — Schutz vor unbefugtem Zugang zu personenbezogenen Daten.', created_by: adminId, created_at: daysAgo(60) },
    // ISO 27001 A.6.1 (Screening) ↔ DSGVO Art. 5 (Processing principles — integrity/confidentiality)
    { id: uuidv4(), tenant_id: tenantId, source_requirement_id: reqA6_1Id, target_requirement_id: reqDsgvo5Id, mapping_type: 'related', notes: 'Personalüberprüfung unterstützt die Gewährleistung von Vertraulichkeit gemäß Art. 5 Abs. 1 lit. f.', created_by: adminId, created_at: daysAgo(55) },
  ]);
  logger.info('  ✓ Cross-Framework Requirement Mappings: 8 ISO↔DSGVO mappings');

  // ─── Asset Regulatory Flags ───────────────────────────────
  await db.insert(assetRegulatoryFlags).values([
    { asset_id: assetDb01Id, framework_id: fwIso27001Id, tenant_id: tenantId, reason: 'Verarbeitet geschäftskritische Daten — ISO 27001 Scope', flagged_at: daysAgo(180), flagged_by: adminId },
    { asset_id: assetDb01Id, framework_id: fwDsgvoId, tenant_id: tenantId, reason: 'Speichert personenbezogene Daten (Kundendaten)', flagged_at: daysAgo(180), flagged_by: adminId },
    { asset_id: assetMysqlId, framework_id: fwDsgvoId, tenant_id: tenantId, reason: 'Datenbank mit personenbezogenen Daten', flagged_at: daysAgo(150), flagged_by: adminId },
    { asset_id: assetErpId, framework_id: fwDsgvoId, tenant_id: tenantId, reason: 'SAP ERP verarbeitet HR- und Kundendaten', flagged_at: daysAgo(100), flagged_by: managerId },
    { asset_id: assetErpId, framework_id: fwIso27001Id, tenant_id: tenantId, reason: 'Geschäftskritisches System — ISO 27001 Scope', flagged_at: daysAgo(100), flagged_by: managerId },
    { asset_id: assetFwId, framework_id: fwIso27001Id, tenant_id: tenantId, reason: 'Perimeter-Sicherheit — ISO 27001 Annex A.13', flagged_at: daysAgo(200), flagged_by: adminId },
    { asset_id: assetAdControllerId, framework_id: fwIso27001Id, tenant_id: tenantId, reason: 'Zentrales Identitätsmanagement — ISO 27001 A.9', flagged_at: daysAgo(180), flagged_by: adminId },
  ]);
  logger.info('  ✓ Asset Regulatory Flags: 7 flags');

  // ─── Seed Evo Types (must run before classifications/capacities) ─────
  // seedEvoTypes() creates classification models/values and capacity types.
  // It's idempotent (checks if types already exist), so safe to call here.
  await seedEvoTypes();

  // ─── Asset Classifications (Evo-1C) ───────────────────────

  const allClassValues = await db.select({
    id: classificationValues.id,
    model_id: classificationValues.model_id,
    value: classificationValues.value,
  }).from(classificationValues);

  // Note: classification models are created in seedEvoTypes, not in doSeed.
  // The models/values may not exist yet at this point.
  // We check and only seed classifications if values exist.
  if (allClassValues.length > 0) {
    const cvByValue = (val: string) => allClassValues.find(v => v.value === val);

    const classificationInserts: Array<{
      asset_id: string;
      value_id: string;
      tenant_id: string;
      justification: string;
      classified_by: string;
      classified_at: string;
    }> = [];

    const addClassification = (assetId: string, valueKey: string, justification: string) => {
      const cv = cvByValue(valueKey);
      if (cv) {
        classificationInserts.push({
          asset_id: assetId,
          value_id: cv.id,
          tenant_id: tenantId,
          justification,
          classified_by: adminId,
          classified_at: daysAgo(60),
        });
      }
    };

    // Database Server — high confidentiality, high integrity, very high availability, critical
    addClassification(assetDb01Id, 'confidentiality_high', 'Speichert Kundendaten und Geschäftsdaten');
    addClassification(assetDb01Id, 'integrity_high', 'Datenintegrität geschäftskritisch');
    addClassification(assetDb01Id, 'availability_very_high', '24/7 Verfügbarkeit erforderlich');
    addClassification(assetDb01Id, 'critical', 'Geschäftskritisches System');
    addClassification(assetDb01Id, 'hoch', 'BSI Schutzbedarf: Hoch');

    // Edge Firewall — high confidentiality, high integrity, very high availability
    addClassification(assetFwId, 'confidentiality_high', 'Perimeter-Sicherheitskomponente');
    addClassification(assetFwId, 'availability_very_high', 'Ausfall = kein Internet/VPN');
    addClassification(assetFwId, 'critical', 'Geschäftskritische Infrastruktur');
    addClassification(assetFwId, 'sehr_hoch', 'BSI Schutzbedarf: Sehr hoch');

    // ERP System — high everything
    addClassification(assetErpId, 'confidentiality_high', 'HR- und Finanzdaten');
    addClassification(assetErpId, 'integrity_very_high', 'Finanz- und Buchungsdaten');
    addClassification(assetErpId, 'availability_high', 'Arbeitszeit-kritisch');
    addClassification(assetErpId, 'critical', 'Geschäftskritisches ERP');
    addClassification(assetErpId, 'sehr_hoch', 'BSI Schutzbedarf: Sehr hoch');

    // Web Servers — medium confidentiality, normal availability
    addClassification(assetWeb01Id, 'confidentiality_normal', 'Öffentliche Webanwendung');
    addClassification(assetWeb01Id, 'availability_high', 'Kunden-facing Service');
    addClassification(assetWeb01Id, 'high', 'Wichtiges Kundensystem');
    addClassification(assetWeb01Id, 'normal', 'BSI Schutzbedarf: Normal');

    // NAS Backup — low confidentiality, high integrity
    addClassification(assetNasId, 'integrity_high', 'Backup-Datenintegrität');
    addClassification(assetNasId, 'availability_normal', 'Nicht zeitkritisch');
    addClassification(assetNasId, 'medium', 'Mittlere Business-Kritikalität');

    // Dev VM — low everything
    addClassification(assetDevVmId, 'confidentiality_low', 'Nur Testdaten');
    addClassification(assetDevVmId, 'availability_low', 'Entwicklungssystem');
    addClassification(assetDevVmId, 'low', 'Geringe Business-Kritikalität');
    addClassification(assetDevVmId, 'normal', 'BSI Schutzbedarf: Normal');

    if (classificationInserts.length > 0) {
      await db.insert(assetClassifications).values(classificationInserts);
      logger.info(`  ✓ Asset Classifications: ${classificationInserts.length} classification assignments`);
    }
  }

  // ─── Asset Capacities (Evo-3C) ────────────────────────────
  const allCapTypes = await db.select({
    id: capacityTypes.id,
    slug: capacityTypes.slug,
  }).from(capacityTypes).where(eq(capacityTypes.tenant_id, tenantId));

  if (allCapTypes.length > 0) {
    const capBySlug = (slug: string) => allCapTypes.find(c => c.slug === slug);

    const capacityInserts: Array<{
      id: string;
      asset_id: string;
      capacity_type_id: string;
      tenant_id: string;
      direction: string;
      total: string;
      allocated: string;
      reserved: string;
      created_at: string;
      updated_at: string;
    }> = [];

    const addCap = (assetId: string, slug: string, dir: string, total: string, allocated: string, reserved: string) => {
      const ct = capBySlug(slug);
      if (ct) {
        capacityInserts.push({
          id: uuidv4(),
          asset_id: assetId,
          capacity_type_id: ct.id,
          tenant_id: tenantId,
          direction: dir,
          total,
          allocated,
          reserved,
          created_at: daysAgo(30),
          updated_at: now,
        });
      }
    };

    // ESXi Host 01 — provides compute
    addCap(assetEsxi01Id, 'cpu_cores', 'provides', '64', '48', '8');
    addCap(assetEsxi01Id, 'ram_gb', 'provides', '512', '384', '64');
    addCap(assetEsxi01Id, 'storage_gb', 'provides', '4000', '3200', '400');

    // ESXi Host 02 — provides compute
    addCap(assetEsxi02Id, 'cpu_cores', 'provides', '64', '36', '12');
    addCap(assetEsxi02Id, 'ram_gb', 'provides', '512', '280', '64');

    // SAN — provides storage
    addCap(assetSanId, 'storage_gb', 'provides', '102400', '78000', '10000');
    addCap(assetSanId, 'iops', 'provides', '100000', '65000', '15000');

    // Rack — provides rack units and power
    addCap(assetRackId, 'rack_units', 'provides', '42', '35', '3');
    addCap(assetRackId, 'power_watts', 'provides', '10000', '7500', '1000');

    // Core Switch — provides ports and bandwidth
    addCap(assetSwId, 'ports', 'provides', '48', '38', '4');
    addCap(assetSwId, 'bandwidth_mbps', 'provides', '10000', '6500', '1500');

    // Web01 VM — consumes compute
    addCap(assetWeb01Id, 'cpu_cores', 'consumes', '4', '4', '0');
    addCap(assetWeb01Id, 'ram_gb', 'consumes', '16', '16', '0');

    if (capacityInserts.length > 0) {
      await db.insert(assetCapacities).values(capacityInserts);
      logger.info(`  ✓ Asset Capacities: ${capacityInserts.length} capacity records`);
    }
  }

  // ─── Service Profiles (Evo-2A) ────────────────────────────
  const spEnterprise24Id = uuidv4();
  const spStandardId = uuidv4();
  const spBasicId = uuidv4();

  await db.insert(serviceProfiles).values([
    {
      id: spEnterprise24Id,
      tenant_id: tenantId,
      name: 'Enterprise 24/7',
      description: 'Premium-Profil für geschäftskritische Services. 24/7 Support, garantierte Reaktionszeiten, dedizierte Ansprechpartner.',
      dimensions: JSON.stringify({
        support_hours: '24/7',
        response_time: '30min',
        resolution_time: '4h',
        dedicated_contact: true,
        proactive_monitoring: true,
        monthly_reporting: true,
      }),
      sla_definition_id: slaGoldId,
      is_active: 1,
      created_at: daysAgo(120),
      updated_at: daysAgo(10),
    },
    {
      id: spStandardId,
      tenant_id: tenantId,
      name: 'Standard Business',
      description: 'Standard-Profil für reguläre Business Services. Geschäftszeiten-Support.',
      dimensions: JSON.stringify({
        support_hours: 'Mo-Fr 08:00-18:00',
        response_time: '4h',
        resolution_time: '24h',
        dedicated_contact: false,
        proactive_monitoring: true,
        monthly_reporting: false,
      }),
      sla_definition_id: slaSilverId,
      is_active: 1,
      created_at: daysAgo(120),
      updated_at: daysAgo(10),
    },
    {
      id: spBasicId,
      tenant_id: tenantId,
      name: 'Basic',
      description: 'Basis-Profil für nicht-kritische Services. Best-Effort Support.',
      dimensions: JSON.stringify({
        support_hours: 'Mo-Fr 09:00-17:00',
        response_time: '8h',
        resolution_time: '48h',
        dedicated_contact: false,
        proactive_monitoring: false,
        monthly_reporting: false,
      }),
      sla_definition_id: slaBronzeId,
      is_active: 1,
      created_at: daysAgo(120),
      updated_at: daysAgo(10),
    },
  ]);

  // Service Entitlements
  await db.insert(serviceEntitlements).values([
    { id: uuidv4(), tenant_id: tenantId, customer_id: customerBankId, service_id: svcDatabaseId, profile_id: spEnterprise24Id, scope: JSON.stringify({ included: ['PostgreSQL', 'MySQL', 'Redis'], excluded: ['MongoDB'], addon: [] }), effective_from: '2025-01-01', effective_until: '2026-12-31', created_at: daysAgo(120) },
    { id: uuidv4(), tenant_id: tenantId, customer_id: customerBankId, service_id: svcSecurityId, profile_id: spEnterprise24Id, scope: JSON.stringify({ included: ['Firewall', 'IDS', 'PAM'], excluded: [], addon: ['Penetrationstest'] }), effective_from: '2025-01-01', effective_until: '2026-12-31', created_at: daysAgo(120) },
    { id: uuidv4(), tenant_id: tenantId, customer_id: customerAcmeId, service_id: svcWebHostingId, profile_id: spStandardId, scope: JSON.stringify({ included: ['Web Hosting', 'SSL'], excluded: ['CDN'], addon: [] }), effective_from: '2025-06-01', effective_until: '2026-05-31', created_at: daysAgo(90) },
    { id: uuidv4(), tenant_id: tenantId, customer_id: customerStadtwerkeId, service_id: svcEmailId, profile_id: spBasicId, scope: JSON.stringify({ included: ['E-Mail Basic'], excluded: ['Archivierung'], addon: [] }), effective_from: '2026-01-01', effective_until: null, created_at: daysAgo(60) },
  ]);
  logger.info('  ✓ Service Profiles: 3 profiles + 4 entitlements');

  // ─── Escalation Rules ─────────────────────────────────────
  await db.insert(escalationRules).values([
    { id: uuidv4(), tenant_id: tenantId, name: 'SLA 80% → 2nd Level', ticket_type: null, priority: null, sla_threshold_pct: 80, target_group_id: opsGroupId, escalation_level: 1, is_active: 1, created_at: daysAgo(120), updated_at: daysAgo(30) },
    { id: uuidv4(), tenant_id: tenantId, name: 'Critical 90% → Operations', ticket_type: 'incident', priority: 'critical', sla_threshold_pct: 90, target_group_id: opsGroupId, escalation_level: 2, is_active: 1, created_at: daysAgo(120), updated_at: daysAgo(30) },
    { id: uuidv4(), tenant_id: tenantId, name: 'SLA Breach → Development', ticket_type: null, priority: 'high', sla_threshold_pct: 100, target_group_id: devGroupId, escalation_level: 3, is_active: 1, created_at: daysAgo(120), updated_at: daysAgo(30) },
  ]);
  logger.info('  ✓ Escalation Rules: 3 rules');

  // ─── Monitoring Sources ───────────────────────────────────
  await db.insert(monitoringSources).values([
    { id: uuidv4(), tenant_id: tenantId, name: 'Checkmk Production', type: 'checkmk_v2', config: JSON.stringify({ base_url: 'https://monitoring.internal/demo/check_mk', site: 'prod', username: 'automation', secret: '***' }), webhook_secret: uuidv4(), is_active: 1, created_at: daysAgo(200) },
    { id: uuidv4(), tenant_id: tenantId, name: 'Prometheus Cluster', type: 'prometheus', config: JSON.stringify({ base_url: 'https://prometheus.internal:9090', scrape_interval: '15s' }), webhook_secret: uuidv4(), is_active: 1, created_at: daysAgo(150) },
  ]);
  logger.info('  ✓ Monitoring Sources: 2 sources (Checkmk, Prometheus)');

  // ─── CAB Data on Change Tickets ─────────────────────────
  // Update extended change tickets with CAB fields
  const changeTicketUpdates = [
    { number: 'CHG-2026-00002', risk_level: 'medium', risk_likelihood: 'possible', risk_impact: 'medium', cab_required: 1, cab_decision: 'approved', cab_decision_by: managerId, cab_decision_at: daysAgo(1), cab_notes: 'Rolling Update genehmigt. Rollback-Plan vorhanden.', planned_start: new Date(Date.now() + 5 * 86400000).toISOString(), planned_end: new Date(Date.now() + 5 * 86400000 + 4 * 3600000).toISOString(), implementation: '1. Drain Nodes, 2. Upgrade Control Plane, 3. Upgrade Worker Nodes, 4. Verify', rollback: 'kubectl rollback to v1.29 snapshot' },
    { number: 'CHG-2026-00003', risk_level: 'high', risk_likelihood: 'possible', risk_impact: 'high', cab_required: 1, cab_decision: null, cab_decision_by: null, cab_decision_at: null, cab_notes: null, planned_start: new Date(Date.now() + 14 * 86400000).toISOString(), planned_end: new Date(Date.now() + 14 * 86400000 + 8 * 3600000).toISOString(), implementation: '1. DC Promotion, 2. FSMO Transfer, 3. DNS Update, 4. Replikation prüfen', rollback: 'FSMO zurück transferieren, alte Gesamtstruktur reaktivieren' },
    { number: 'CHG-2026-00004', risk_level: 'critical', risk_likelihood: 'likely', risk_impact: 'critical', cab_required: 1, cab_decision: 'approved', cab_decision_by: adminId, cab_decision_at: daysAgo(0), cab_notes: 'Notfall-Change genehmigt. CVE kritisch, sofortiges Patchen erforderlich.', planned_start: now, planned_end: new Date(Date.now() + 4 * 3600000).toISOString(), implementation: 'apt update && apt upgrade elasticsearch', rollback: 'Snapshot restore von vor dem Patch' },
    { number: 'CHG-2026-00005', risk_level: 'low', risk_likelihood: 'unlikely', risk_impact: 'low', cab_required: 0, cab_decision: null, cab_decision_by: null, cab_decision_at: null, cab_notes: null, planned_start: new Date(Date.now() + 10 * 86400000).toISOString(), planned_end: new Date(Date.now() + 10 * 86400000 + 2 * 3600000).toISOString(), implementation: 'NetApp Shelf hinzufügen, Aggregate erweitern', rollback: 'Shelf entfernen, kein Datenverlust' },
    { number: 'CHG-2026-00006', risk_level: 'low', risk_likelihood: 'unlikely', risk_impact: 'low', cab_required: 0, cab_decision: null, cab_decision_by: null, cab_decision_at: null, cab_notes: null, planned_start: daysAgo(11), planned_end: daysAgo(10), implementation: 'certbot renew --force-renewal', rollback: 'Backup-Zertifikate einspielen' },
    { number: 'CHG-2026-00007', risk_level: 'medium', risk_likelihood: 'possible', risk_impact: 'medium', cab_required: 1, cab_decision: 'deferred', cab_decision_by: managerId, cab_decision_at: daysAgo(1), cab_notes: 'Verschoben auf nächste Woche. Erst E2E-Tests im Staging abschließen.', planned_start: new Date(Date.now() + 7 * 86400000).toISOString(), planned_end: new Date(Date.now() + 7 * 86400000 + 6 * 3600000).toISOString(), implementation: '1. Backup, 2. gitlab-ctl upgrade, 3. DB Migrate, 4. Verify', rollback: 'gitlab-ctl restore from backup' },
  ];

  for (const chg of changeTicketUpdates) {
    await db.update(tickets)
      .set({
        change_risk_level: chg.risk_level,
        change_risk_likelihood: chg.risk_likelihood,
        change_risk_impact: chg.risk_impact,
        change_planned_start: chg.planned_start,
        change_planned_end: chg.planned_end,
        change_implementation: chg.implementation,
        change_rollback_plan: chg.rollback,
        cab_required: chg.cab_required,
        cab_decision: chg.cab_decision,
        cab_decision_by: chg.cab_decision_by,
        cab_decision_at: chg.cab_decision_at,
        cab_notes: chg.cab_notes,
      })
      .where(eq(tickets.ticket_number, chg.number));
  }
  logger.info('  ✓ CAB Data: 7 changes with risk assessment, 3 CAB decisions (2 approved, 1 deferred)');

  // ─── Known Errors (KEDB) ────────────────────────────────
  // Link to problem tickets: PRB-2026-00001 (DB memory), PRB-2026-00002 (DNS timeout), PRB-2026-00003 (Redis failover)
  const prbDbMemoryId = sampleTickets[5]!.id; // PRB-2026-00001 (index 5 = last base ticket)
  const prbDnsId = extendedTickets[13]!.id;   // PRB-2026-00002
  const prbRedisId = extendedTickets[14]!.id; // PRB-2026-00003

  await db.insert(knownErrors).values([
    {
      id: uuidv4(),
      tenant_id: tenantId,
      title: 'MySQL InnoDB Buffer Pool erschöpft bei großen Reports',
      symptom: 'Datenbank-Cluster zeigt >95% Speicherauslastung wenn mehrere große Reports gleichzeitig laufen. Queries werden extrem langsam.',
      workaround: 'Reports nur nacheinander ausführen oder auf Read-Replica umleiten. innodb_buffer_pool_size temporär erhöhen.',
      root_cause: 'Der InnoDB Buffer Pool ist für die aktuelle Datenmenge unterdimensioniert. Bei parallelen Report-Queries wird der gesamte Buffer Pool invalidiert.',
      status: 'workaround_available',
      problem_id: prbDbMemoryId,
      created_by: managerId,
      created_at: daysAgo(15),
      updated_at: daysAgo(3),
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      title: 'DNS-Resolver Timeout bei internen .local Domains',
      symptom: 'Sporadische DNS-Timeouts (2-3x pro Woche) bei Auflösung interner .local Domains. Betrifft alle Dienste die interne Namensauflösung nutzen.',
      workaround: 'Betroffene Hosts: /etc/hosts mit statischen Einträgen für kritische Services ergänzen. DNS-Cache TTL auf Clients erhöhen.',
      root_cause: null,
      status: 'identified',
      problem_id: prbDnsId,
      created_by: adminId,
      created_at: daysAgo(12),
      updated_at: daysAgo(5),
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      title: 'Redis Sentinel Failover schlägt bei geplanter Wartung fehl',
      symptom: 'Bei geplantem Herunterfahren des Redis-Masters übernimmt der Sentinel nicht korrekt. Clients verlieren Verbindung für 30-60 Sekunden.',
      workaround: 'Vor Wartung manuell: redis-cli -p 26379 SENTINEL FAILOVER mymaster. Danach 10s warten bevor Master gestoppt wird.',
      root_cause: 'Sentinel-Konfiguration hat down-after-milliseconds auf 30000ms (30s). Bei geplanter Wartung ist das zu lang.',
      status: 'workaround_available',
      problem_id: prbRedisId,
      created_by: managerId,
      created_at: daysAgo(8),
      updated_at: daysAgo(2),
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      title: 'Outlook-Kalender-Sync bricht bei großen Serien ab',
      symptom: 'Kalender mit wiederkehrenden Terminen (>100 Instanzen) synchronisieren nicht korrekt. Änderungen an Einzelterminen gehen verloren.',
      workaround: 'Betroffene Serien löschen und neu erstellen mit max. 52 Instanzen (1 Jahr).',
      root_cause: null,
      status: 'identified',
      problem_id: null,
      created_by: agentId,
      created_at: daysAgo(20),
      updated_at: daysAgo(20),
    },
    {
      id: uuidv4(),
      tenant_id: tenantId,
      title: 'VPN-Client trennt nach Standby auf macOS',
      symptom: 'Nach dem Aufwachen aus dem Standby verbindet sich der VPN-Client auf macOS nicht automatisch neu. Manuelle Neuverbindung erforderlich.',
      workaround: 'VPN-Client nach Standby manuell neu starten oder Auto-Reconnect in den Client-Einstellungen aktivieren (Einstellungen > Netzwerk > Erweitert).',
      root_cause: 'macOS Sonoma hat das Netzwerk-Handling beim Aufwachen geändert. Der VPN-Client erkennt die Netzwerkänderung nicht.',
      status: 'resolved',
      problem_id: null,
      created_by: agentId,
      created_at: daysAgo(45),
      updated_at: daysAgo(10),
    },
  ]);
  logger.info('  ✓ Known Errors: 5 KEDB entries (2 workaround_available, 2 identified, 1 resolved)');

  // ─── Security & Endpoint Assets ─────────────────────────
  const assetWafId = uuidv4();
  const assetSiemId = uuidv4();
  const assetIdsId = uuidv4();
  const assetDesktop01Id = uuidv4();
  const assetDesktop02Id = uuidv4();
  const assetTabletId = uuidv4();
  const assetMfpId = uuidv4();

  await db.insert(assets).values([
    { id: assetWafId, tenant_id: tenantId, asset_type: 'network_firewall', name: 'waf-web-01', display_name: 'Web Application Firewall', status: 'active', ip_address: '10.0.0.15', location: 'DMZ Rack 02', environment: 'production', attributes: JSON.stringify({ vendor: 'F5', model: 'BIG-IP ASM', firmware: '17.1.0', function: 'WAF', protected_services: ['web-srv-01', 'web-srv-02', 'erp.internal'] }), created_at: daysAgo(200), updated_at: daysAgo(5), created_by: adminId },
    { id: assetSiemId, tenant_id: tenantId, asset_type: 'application', name: 'siem-splunk-01', display_name: 'Splunk SIEM', status: 'active', ip_address: '10.0.5.120', location: 'Serverraum A, Rack 03', environment: 'production', attributes: JSON.stringify({ vendor: 'Splunk', version: '9.2.0', function: 'SIEM', daily_ingestion_gb: 50, retention_days: 365, agents: 42 }), created_at: daysAgo(300), updated_at: daysAgo(2), created_by: adminId },
    { id: assetIdsId, tenant_id: tenantId, asset_type: 'network_firewall', name: 'ids-snort-01', display_name: 'Snort IDS/IPS', status: 'active', ip_address: '10.0.0.16', location: 'DMZ Rack 02', environment: 'production', attributes: JSON.stringify({ vendor: 'Snort', version: '3.1.72', function: 'IDS/IPS', mode: 'inline', rules_updated: daysAgo(1) }), created_at: daysAgo(180), updated_at: daysAgo(1), created_by: adminId },
    { id: assetDesktop01Id, tenant_id: tenantId, asset_type: 'workstation', name: 'ws-buchhaltung-01', display_name: 'Arbeitsplatz Buchhaltung 1', status: 'active', ip_address: '10.0.10.101', location: 'Büro EG, Platz 1', environment: 'production', attributes: JSON.stringify({ manufacturer: 'Dell', model: 'OptiPlex 7090', os: 'Windows 11 Pro', cpu: 'Intel i7-11700', ram_gb: 32, disk_gb: 512 }), created_at: daysAgo(400), updated_at: daysAgo(30), created_by: agentId },
    { id: assetDesktop02Id, tenant_id: tenantId, asset_type: 'workstation', name: 'ws-empfang-01', display_name: 'Arbeitsplatz Empfang', status: 'active', ip_address: '10.0.10.102', location: 'Empfang', environment: 'production', attributes: JSON.stringify({ manufacturer: 'HP', model: 'ProDesk 400 G9', os: 'Windows 11 Pro', cpu: 'Intel i5-12500', ram_gb: 16, disk_gb: 256 }), created_at: daysAgo(350), updated_at: daysAgo(60), created_by: agentId },
    { id: assetTabletId, tenant_id: tenantId, asset_type: 'laptop', name: 'tablet-lager-01', display_name: 'Lager-Tablet (iPad)', status: 'active', ip_address: null, location: 'Lager', environment: 'production', attributes: JSON.stringify({ manufacturer: 'Apple', model: 'iPad Pro 12.9"', os: 'iPadOS 17', serial: 'DMPXXX', mdm: 'Jamf Pro', usage: 'Lagerverwaltung/Inventur' }), created_at: daysAgo(200), updated_at: daysAgo(15), created_by: agentId },
    { id: assetMfpId, tenant_id: tenantId, asset_type: 'printer', name: 'mfp-og1-01', display_name: 'Multifunktionsdrucker OG1', status: 'active', ip_address: '10.0.10.200', location: 'OG1 Flur', environment: 'production', attributes: JSON.stringify({ manufacturer: 'Ricoh', model: 'IM C3010', type: 'Multifunktion (Druck/Scan/Kopie)', color: true, duplex: true, network: 'Ethernet + WLAN' }), created_at: daysAgo(250), updated_at: daysAgo(45), created_by: agentId },
  ]);
  logger.info('  ✓ Security & Endpoint Assets: 7 (WAF, SIEM, IDS, 2 Workstations, Tablet, MFP)');

  // Relations for security assets
  await db.insert(assetRelations).values([
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetWafId, target_asset_id: assetFwId, relation_type: 'connected_to', properties: JSON.stringify({ note: 'WAF hinter Edge-Firewall' }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetIdsId, target_asset_id: assetSwId, relation_type: 'connected_to', properties: JSON.stringify({ note: 'IDS am Mirror-Port des Core-Switch' }), created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetSiemId, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetWeb01Id, target_asset_id: assetWafId, relation_type: 'depends_on', properties: JSON.stringify({ note: 'Web-Traffic läuft durch WAF' }), created_at: now, created_by: adminId },
  ]);
  logger.info('  ✓ Security Relations: 4 (WAF, IDS, SIEM connections)');

  logger.info('\n✅ Seed completed successfully!');
  logger.info('\n📋 Login credentials:');
  logger.info('   Admin:   admin@opsweave.local / changeme');
  logger.info('   Manager: manager@opsweave.local / password123');
  logger.info('   Agent:   agent@opsweave.local / password123');
  logger.info('   Viewer:  viewer@opsweave.local / password123');
  logger.info('\n🌐 Customer Portal credentials:');
  logger.info('   Acme Portal User: portal@acme.example.com / changeme');
}

/**
 * Seed Evo type registries for existing databases.
 * Checks each tenant and seeds system types if not already present.
 * Safe to call multiple times — skips tenants that already have types.
 */
export async function seedEvoTypes(): Promise<void> {
  const db = getDb() as TypedDb;
  const seedNow = new Date().toISOString();

  // Get all tenants
  const allTenants = await db.select({ id: tenants.id }).from(tenants);

  for (const tenant of allTenants) {
    // Check if asset types already exist for this tenant
    const existingTypes = await db.select({ id: assetTypes.id }).from(assetTypes)
      .where(eq(assetTypes.tenant_id, tenant.id))
      .limit(1);

    if (existingTypes.length === 0) {
    // Seed system asset types
    const systemAssetTypeSlugs = [
      { slug: 'server_physical', name: 'Physical Server', category: 'compute' },
      { slug: 'server_virtual', name: 'Virtual Machine', category: 'compute' },
      { slug: 'virtualization_host', name: 'Virtualization Host', category: 'compute' },
      { slug: 'container', name: 'Container', category: 'compute' },
      { slug: 'container_host', name: 'Container Host', category: 'compute' },
      { slug: 'network_switch', name: 'Switch', category: 'network' },
      { slug: 'network_router', name: 'Router', category: 'network' },
      { slug: 'network_firewall', name: 'Firewall', category: 'network' },
      { slug: 'network_load_balancer', name: 'Load Balancer', category: 'network' },
      { slug: 'network_wap', name: 'Wireless Access Point', category: 'network' },
      { slug: 'storage_san', name: 'SAN Storage', category: 'storage' },
      { slug: 'storage_nas', name: 'NAS Storage', category: 'storage' },
      { slug: 'storage_backup', name: 'Backup System', category: 'storage' },
      { slug: 'rack', name: 'Rack', category: 'infrastructure' },
      { slug: 'pdu', name: 'Power Distribution Unit', category: 'infrastructure' },
      { slug: 'ups', name: 'UPS', category: 'infrastructure' },
      { slug: 'database', name: 'Database', category: 'software' },
      { slug: 'database_instance', name: 'Database Instance', category: 'software' },
      { slug: 'application', name: 'Application', category: 'software' },
      { slug: 'service', name: 'Service', category: 'software' },
      { slug: 'middleware', name: 'Middleware', category: 'software' },
      { slug: 'cluster', name: 'Cluster', category: 'software' },
      { slug: 'workstation', name: 'Workstation', category: 'enduser' },
      { slug: 'laptop', name: 'Laptop', category: 'enduser' },
      { slug: 'printer', name: 'Printer', category: 'enduser' },
      { slug: 'ip_address', name: 'IP Address', category: 'security' },
      { slug: 'domain', name: 'Domain', category: 'security' },
      { slug: 'certificate', name: 'Certificate', category: 'security' },
      { slug: 'port', name: 'Port', category: 'security' },
      { slug: 'service_endpoint', name: 'Service Endpoint', category: 'security' },
      { slug: 'software', name: 'Software Package', category: 'software' },
      { slug: 'other', name: 'Other', category: 'other' },
    ];

    await db.insert(assetTypes).values(systemAssetTypeSlugs.map((at) => ({
      id: uuidv4(),
      tenant_id: tenant.id,
      slug: at.slug,
      name: at.name,
      category: at.category,
      is_system: 1,
      is_active: 1,
      attribute_schema: '[]',
      created_at: seedNow,
      updated_at: seedNow,
    })));

    // Check if relation types already exist
    const existingRelTypes = await db.select({ id: relationTypes.id }).from(relationTypes)
      .where(eq(relationTypes.tenant_id, tenant.id))
      .limit(1);

    if (existingRelTypes.length === 0) {
      // REQ-3.2a: Relation types with properties_schema
      const evoRelTypeSchemaLookup: Record<string, string> = {
        runs_on: JSON.stringify([
          { key: 'cpu_cores', label: { de: 'CPU-Kerne', en: 'CPU Cores' }, type: 'number', required: false, sort_order: 0 },
          { key: 'ram_gb', label: { de: 'RAM (GB)', en: 'RAM (GB)' }, type: 'number', required: false, sort_order: 1 },
          { key: 'storage_gb', label: { de: 'Speicher (GB)', en: 'Storage (GB)' }, type: 'number', required: false, sort_order: 2 },
        ]),
        connected_to: JSON.stringify([
          { key: 'bandwidth_mbps', label: { de: 'Bandbreite (Mbps)', en: 'Bandwidth (Mbps)' }, type: 'number', required: false, sort_order: 0 },
          { key: 'latency_ms', label: { de: 'Latenz (ms)', en: 'Latency (ms)' }, type: 'number', required: false, sort_order: 1 },
          { key: 'vlan', label: { de: 'VLAN', en: 'VLAN' }, type: 'number', required: false, sort_order: 2 },
        ]),
        depends_on: JSON.stringify([
          { key: 'dependency_type', label: { de: 'Abhängigkeitstyp', en: 'Dependency Type' }, type: 'select', required: false, options: [{ value: 'hard', label: { de: 'Hart', en: 'Hard' } }, { value: 'soft', label: { de: 'Weich', en: 'Soft' } }], sort_order: 0 },
          { key: 'priority', label: { de: 'Priorität', en: 'Priority' }, type: 'select', required: false, options: [{ value: 'critical', label: { de: 'Kritisch', en: 'Critical' } }, { value: 'high', label: { de: 'Hoch', en: 'High' } }, { value: 'medium', label: { de: 'Mittel', en: 'Medium' } }, { value: 'low', label: { de: 'Niedrig', en: 'Low' } }], sort_order: 1 },
        ]),
        backup_of: JSON.stringify([
          { key: 'schedule', label: { de: 'Zeitplan', en: 'Schedule' }, type: 'text', required: false, sort_order: 0 },
          { key: 'retention_days', label: { de: 'Aufbewahrung (Tage)', en: 'Retention (Days)' }, type: 'number', required: false, sort_order: 1 },
          { key: 'backup_type', label: { de: 'Backup-Typ', en: 'Backup Type' }, type: 'select', required: false, options: [{ value: 'full', label: { de: 'Vollständig', en: 'Full' } }, { value: 'incremental', label: { de: 'Inkrementell', en: 'Incremental' } }, { value: 'differential', label: { de: 'Differenziell', en: 'Differential' } }], sort_order: 2 },
        ]),
      };

      const systemRelTypeSlugs = [
        { slug: 'runs_on', name: 'Runs on', category: 'dependency' },
        { slug: 'connected_to', name: 'Connected to', category: 'network' },
        { slug: 'stored_on', name: 'Stored on', category: 'storage' },
        { slug: 'powered_by', name: 'Powered by', category: 'infrastructure' },
        { slug: 'member_of', name: 'Member of', category: 'grouping' },
        { slug: 'depends_on', name: 'Depends on', category: 'dependency' },
        { slug: 'backup_of', name: 'Backup of', category: 'storage' },
        { slug: 'exposes', name: 'Exposes', category: 'network' },
        { slug: 'protects', name: 'Protects', category: 'security' },
        { slug: 'backs_up', name: 'Backs up', category: 'storage' },
        { slug: 'monitored_by', name: 'Monitored by', category: 'monitoring' },
        { slug: 'serves', name: 'Serves', category: 'service' },
        { slug: 'governed_by', name: 'Governed by', category: 'compliance' },
        { slug: 'licensed_to', name: 'Licensed to', category: 'licensing' },
        { slug: 'encrypts', name: 'Encrypts', category: 'security' },
      ];

      await db.insert(relationTypes).values(systemRelTypeSlugs.map((rt) => ({
        id: uuidv4(),
        tenant_id: tenant.id,
        slug: rt.slug,
        name: rt.name,
        category: rt.category,
        is_directional: 1,
        source_types: '[]',
        target_types: '[]',
        properties_schema: evoRelTypeSchemaLookup[rt.slug] ?? '[]',
        is_system: 1,
        is_active: 1,
        created_at: seedNow,
      })));
    }
    } // end asset types check

    // ── Classification Models (Evo-1C) ──────────────────────────────
    const existingClassModels = await db.select({ id: classificationModels.id }).from(classificationModels)
      .where(eq(classificationModels.tenant_id, tenant.id))
      .limit(1);

    if (existingClassModels.length === 0) {
      const ciaModelId = uuidv4();
      const bcModelId = uuidv4();
      const sbModelId = uuidv4();

      await db.insert(classificationModels).values([
        {
          id: ciaModelId,
          tenant_id: tenant.id,
          name: 'CIA+A',
          description: 'CIA+A Classification (BSI-aligned)',
          is_system: 1,
          is_active: 1,
          created_at: seedNow,
        },
        {
          id: bcModelId,
          tenant_id: tenant.id,
          name: 'Business Criticality',
          description: 'Business criticality classification',
          is_system: 1,
          is_active: 1,
          created_at: seedNow,
        },
        {
          id: sbModelId,
          tenant_id: tenant.id,
          name: 'Schutzbedarf (BSI)',
          description: 'BSI IT-Grundschutz Schutzbedarfsfeststellung',
          is_system: 1,
          is_active: 1,
          created_at: seedNow,
        },
      ]);

      // CIA+A dimension values
      const ciaDimensions = ['confidentiality', 'integrity', 'availability', 'authenticity'] as const;
      const ciaLevels = ['none', 'low', 'normal', 'high', 'very_high'] as const;
      const ciaColors: Record<typeof ciaLevels[number], string> = {
        none: '#94a3b8',
        low: '#22c55e',
        normal: '#3b82f6',
        high: '#f59e0b',
        very_high: '#ef4444',
      };

      const ciaValues: Array<{
        id: string;
        model_id: string;
        value: string;
        label: string;
        color: string;
        sort_order: number;
      }> = [];
      let sortOrder = 0;
      for (const dim of ciaDimensions) {
        for (const level of ciaLevels) {
          ciaValues.push({
            id: uuidv4(),
            model_id: ciaModelId,
            value: `${dim}_${level}`,
            label: JSON.stringify({
              de: `${dim.charAt(0).toUpperCase() + dim.slice(1)}: ${level.replace('_', ' ')}`,
              en: `${dim.charAt(0).toUpperCase() + dim.slice(1)}: ${level.replace('_', ' ')}`,
            }),
            color: ciaColors[level],
            sort_order: sortOrder++,
          });
        }
      }
      await db.insert(classificationValues).values(ciaValues);

      // Business Criticality values
      const bcLevels = [
        { value: 'low', color: '#22c55e' },
        { value: 'medium', color: '#3b82f6' },
        { value: 'high', color: '#f59e0b' },
        { value: 'critical', color: '#ef4444' },
      ];
      await db.insert(classificationValues).values(bcLevels.map((lv, idx) => ({
        id: uuidv4(),
        model_id: bcModelId,
        value: lv.value,
        label: JSON.stringify({
          de: lv.value.charAt(0).toUpperCase() + lv.value.slice(1),
          en: lv.value.charAt(0).toUpperCase() + lv.value.slice(1),
        }),
        color: lv.color,
        sort_order: idx,
      })));

      // Schutzbedarf (BSI) values
      const sbLevels = [
        { value: 'normal', de: 'Normal', en: 'Normal', color: '#22c55e' },
        { value: 'hoch', de: 'Hoch', en: 'High', color: '#f59e0b' },
        { value: 'sehr_hoch', de: 'Sehr hoch', en: 'Very High', color: '#ef4444' },
      ];
      await db.insert(classificationValues).values(sbLevels.map((lv, idx) => ({
        id: uuidv4(),
        model_id: sbModelId,
        value: lv.value,
        label: JSON.stringify({ de: lv.de, en: lv.en }),
        color: lv.color,
        sort_order: idx,
      })));
    }

    // ── Capacity Types (Evo-3C) ──────────────────────────────────
    const existingCapTypes = await db.select({ id: capacityTypes.id }).from(capacityTypes)
      .where(eq(capacityTypes.tenant_id, tenant.id))
      .limit(1);

    if (existingCapTypes.length === 0) {
      const systemCapTypes = [
        { slug: 'cpu_cores', name: 'CPU Cores', unit: 'cores', category: 'compute' },
        { slug: 'cpu_threads', name: 'CPU Threads', unit: 'threads', category: 'compute' },
        { slug: 'ram_gb', name: 'RAM', unit: 'GB', category: 'memory' },
        { slug: 'storage_gb', name: 'Storage', unit: 'GB', category: 'storage' },
        { slug: 'iops', name: 'IOPS', unit: 'IOPS', category: 'storage' },
        { slug: 'bandwidth_mbps', name: 'Bandwidth', unit: 'Mbps', category: 'network' },
        { slug: 'ip_addresses', name: 'IP Addresses', unit: 'addresses', category: 'network' },
        { slug: 'ports', name: 'Ports', unit: 'ports', category: 'network' },
        { slug: 'power_watts', name: 'Power', unit: 'W', category: 'infrastructure' },
        { slug: 'rack_units', name: 'Rack Units', unit: 'U', category: 'infrastructure' },
        { slug: 'license_count', name: 'Licenses', unit: 'licenses', category: 'licensing' },
      ];

      await db.insert(capacityTypes).values(systemCapTypes.map((ct) => ({
        id: uuidv4(),
        tenant_id: tenant.id,
        slug: ct.slug,
        name: ct.name,
        unit: ct.unit,
        category: ct.category,
        is_system: 1,
        created_at: seedNow,
      })));
    }

    logger.info({ tenantId: tenant.id }, 'Evo: seeded system asset types + relation types + classification models + capacity types');
  }
}

// CLI entry point: only runs when executed directly (not when imported)
const isDirectExecution = process.argv[1]?.includes('seed');
if (isDirectExecution) {
  (async () => {
    logger.info('Starting seed');
    await initDatabase();
    await doSeed();
    process.exit(0);
  })().catch((err) => {
    logger.fatal({ err }, 'Seed failed');
    process.exit(1);
  });
}
