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
} from '../schema/index.js';
import { DEMO_LICENSE_KEY } from './demo-license.js';

const now = new Date().toISOString();
const BCRYPT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Starting seed...');
  await initDatabase();
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
  console.log('  ✓ Tenant: Demo Organisation (Enterprise license applied)');

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
  console.log('  ✓ Users: admin, manager, agent, viewer');

  // ─── Tenant Memberships ─────────────────────────────────
  await db.insert(tenantUserMemberships).values([
    { tenant_id: tenantId, user_id: adminId, role: 'admin', is_default: 1 },
    { tenant_id: tenantId, user_id: managerId, role: 'manager', is_default: 1 },
    { tenant_id: tenantId, user_id: agentId, role: 'agent', is_default: 1 },
    { tenant_id: tenantId, user_id: viewerId, role: 'viewer', is_default: 1 },
  ]);
  console.log('  ✓ Tenant memberships assigned');

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
  console.log('  ✓ Groups: 1st Level Support, Operations, Development');

  // ─── Group Memberships ──────────────────────────────────
  await db.insert(userGroupMemberships).values([
    { user_id: agentId, group_id: supportGroupId, tenant_id: tenantId, role_in_group: 'member' },
    { user_id: managerId, group_id: supportGroupId, tenant_id: tenantId, role_in_group: 'lead' },
    { user_id: agentId, group_id: opsGroupId, tenant_id: tenantId, role_in_group: 'member' },
    { user_id: managerId, group_id: devGroupId, tenant_id: tenantId, role_in_group: 'lead' },
  ]);
  console.log('  ✓ Group memberships assigned');

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
  console.log('  ✓ Customers: Acme GmbH, TechCorp AG, MedTech Solutions');

  // ─── Customer Portal Users ────────────────────────────────
  // Separate user table — not the same as internal users.
  // Portal users see only tickets belonging to their customer within the tenant.

  const portalUserHash = await bcrypt.hash('changeme', BCRYPT_ROUNDS);

  await db.insert(customerPortalUsers).values({
    id: '00000000-0000-0000-0000-000000000099',
    tenant_id: tenantId,
    customer_id: customerAcmeId,
    email: 'portal@acme.example.de',
    display_name: 'Acme Portal User',
    password_hash: portalUserHash,
    is_active: 1,
    last_login: null,
    created_at: now,
  });
  console.log('  ✓ Customer Portal User: portal@acme.example.de (Acme GmbH)');

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
  console.log('  ✓ Categories: Netzwerk, Server, Applikation, Datenbank, Security, Arbeitsplatz, Sonstiges');

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
      sla_tier: 'silver',
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
      sla_tier: 'silver',
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
      ip_address: '10.0.5.10',
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
  console.log('  ✓ Assets: 14 CMDB assets (rack, VMs, firewall, switch, etc.)');

  // ─── Asset Relations ───────────────────────────────────
  await db.insert(assetRelations).values([
    // VMs run on ESXi hosts
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetWeb01Id, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetWeb02Id, target_asset_id: assetEsxi02Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetDb01Id, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    // MySQL runs on DB server
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetMysqlId, target_asset_id: assetDb01Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    // OpsWeave depends on MySQL + Webserver
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetOpsweaveId, target_asset_id: assetMysqlId, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetOpsweaveId, target_asset_id: assetWeb01Id, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
    // Hardware in rack
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetEsxi01Id, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetEsxi02Id, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetSwId, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    // Network connections
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetFwId, target_asset_id: assetSwId, relation_type: 'connected_to', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetLbId, target_asset_id: assetSwId, relation_type: 'connected_to', properties: '{}', created_at: now, created_by: adminId },
    // Backup relation
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetNasId, target_asset_id: assetMysqlId, relation_type: 'backup_of', properties: '{}', created_at: now, created_by: adminId },
  ]);
  console.log('  ✓ Asset Relations: 12 relations (runs_on, depends_on, member_of, connected_to, backup_of)');

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
  console.log('  ✓ Tickets: 6 sample tickets (4 incidents [1 child], 1 change, 1 problem)');

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
  console.log('  ✓ Comments: 2 sample comments');

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
  console.log('  ✓ History: 2 sample history entries');

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

  console.log('  ✓ Workflows: 2 templates + 10 steps');

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
      content: `# VPN-Verbindung einrichten\n\nSchritt-für-Schritt-Anleitung für Windows 10/11.\n\n## Voraussetzungen\n- VPN-Client (GlobalProtect oder Cisco AnyConnect)\n- Zugangsdaten vom IT-Administrator\n\n## Einrichtung\n1. VPN-Client öffnen\n2. Server-Adresse eingeben: vpn.firma.de\n3. Benutzername + Passwort eingeben\n4. Verbinden klicken\n\n## Fehlersuche\n- Firewall prüfen (Port 443 muss offen sein)\n- DNS-Auflösung testen`,
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

  console.log('  ✓ Knowledge Base: 5 articles + 1 ticket link');

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
  console.log('  ✓ Service Descriptions: 8 service descriptions');

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
  console.log('  ✓ Horizontal Catalogs: 2 catalogs (Standard + Premium) with items');

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
  console.log('  ✓ Extended Service Descriptions: 4 additional services');

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
  console.log('  ✓ Extended Horizontal Catalogs: DevOps (4 items), Managed Infrastructure (8 items)');

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
  console.log('  ✓ Extended Customers: 5 additional customers');

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
  console.log('  ✓ Vertical Catalogs: 3 catalogs (Bank, Acme, MedTech)');

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
  console.log('  ✓ Vertical Overrides: Bank gets enhanced security service');

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
  console.log('  ✓ Compliance Frameworks: ISO 27001:2022, DSGVO/GDPR');

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
  console.log('  ✓ Regulatory Requirements: 8 ISO 27001 + 6 DSGVO requirements');

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
  console.log('  ✓ Compliance Mappings: 17 requirement-service mappings');

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
    { id: assetMailGwId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'mail-gw-01', display_name: 'Mail Gateway 01', status: 'active', ip_address: '10.0.5.10', location: 'ESXi Host 01', sla_tier: 'gold', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vcpu": 4, "ram_gb": 8, "os": "Ubuntu 22.04 LTS", "software": "Postfix + SpamAssassin"}', created_at: now, updated_at: now, created_by: adminId },
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
    { id: assetGitlabId, tenant_id: tenantId, asset_type: 'application', name: 'gitlab-prod', display_name: 'GitLab CE', status: 'active', ip_address: '10.0.4.20', location: 'ESXi Host 02', sla_tier: 'gold', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"version": "16.8", "runners": 4, "repos": 67}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetPrometheusId, tenant_id: tenantId, asset_type: 'application', name: 'prometheus-prod', display_name: 'Prometheus Monitoring', status: 'active', ip_address: '10.0.5.20', location: 'ESXi Host 02', sla_tier: 'gold', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"version": "2.49", "targets": 142, "retention_days": 30}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetK8sClusterId, tenant_id: tenantId, asset_type: 'container_platform', name: 'k8s-prod-01', display_name: 'Kubernetes Production Cluster', status: 'active', ip_address: '10.0.6.1', location: 'RZ Frankfurt', sla_tier: 'platinum', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"version": "1.29", "nodes": 6, "pods": 87, "distribution": "RKE2"}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetRedisId, tenant_id: tenantId, asset_type: 'database', name: 'redis-cache-01', display_name: 'Redis Cache Cluster', status: 'active', ip_address: '10.0.3.20', location: 'ESXi Host 01', sla_tier: 'gold', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"version": "7.2", "mode": "cluster", "nodes": 3, "memory_gb": 32}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetElasticId, tenant_id: tenantId, asset_type: 'database', name: 'elastic-prod-01', display_name: 'Elasticsearch Cluster', status: 'active', ip_address: '10.0.3.30', location: 'ESXi Host 02', sla_tier: 'silver', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"version": "8.12", "nodes": 3, "indices": 45, "size_gb": 120}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetCiCdId, tenant_id: tenantId, asset_type: 'application', name: 'jenkins-prod', display_name: 'Jenkins CI/CD', status: 'active', ip_address: '10.0.4.30', location: 'ESXi Host 02', sla_tier: 'silver', environment: 'production', owner_group_id: devGroupId, customer_id: null, attributes: '{"version": "2.440", "agents": 8, "pipelines": 34}', created_at: now, updated_at: now, created_by: managerId },
    { id: assetDnsId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'dns-ns-01', display_name: 'DNS Server 01', status: 'active', ip_address: '10.0.1.2', location: 'ESXi Host 01', sla_tier: 'platinum', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"os": "Ubuntu 22.04", "software": "BIND 9.18", "zones": 23}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetProxyId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'proxy-squid-01', display_name: 'Web Proxy', status: 'active', ip_address: '10.0.1.3', location: 'ESXi Host 02', sla_tier: 'silver', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"os": "Ubuntu 22.04", "software": "Squid 5.7", "users": 200}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetTestVmId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'test-vm-01', display_name: 'Test VM 01', status: 'active', ip_address: '10.0.100.10', location: 'ESXi Host 02', sla_tier: 'none', environment: 'test', owner_group_id: devGroupId, customer_id: null, attributes: '{"vcpu": 2, "ram_gb": 4, "os": "Ubuntu 22.04"}', created_at: now, updated_at: now, created_by: agentId },
    { id: assetStagingVmId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'staging-app-01', display_name: 'Staging Application Server', status: 'active', ip_address: '10.0.100.20', location: 'ESXi Host 02', sla_tier: 'none', environment: 'staging', owner_group_id: devGroupId, customer_id: null, attributes: '{"vcpu": 4, "ram_gb": 8, "os": "Ubuntu 22.04"}', created_at: now, updated_at: now, created_by: managerId },
    { id: assetFileServerId, tenant_id: tenantId, asset_type: 'server_virtual', name: 'file-srv-01', display_name: 'Fileserver 01', status: 'active', ip_address: '10.0.2.50', location: 'ESXi Host 01', sla_tier: 'silver', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"os": "Windows Server 2022", "shares": 15, "size_tb": 8}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetUpsId, tenant_id: tenantId, asset_type: 'power_supply', name: 'ups-rack01', display_name: 'USV Rack 01', status: 'active', ip_address: '10.0.0.200', location: 'RZ Frankfurt, Rack 01, HE 45', sla_tier: 'gold', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vendor": "APC Smart-UPS 3000", "capacity_va": 3000, "runtime_min": 15}', created_at: now, updated_at: now, created_by: adminId },
    { id: assetPduId, tenant_id: tenantId, asset_type: 'power_supply', name: 'pdu-rack01-a', display_name: 'PDU Rack 01 A-Seite', status: 'active', ip_address: '10.0.0.201', location: 'RZ Frankfurt, Rack 01', sla_tier: 'none', environment: 'production', owner_group_id: opsGroupId, customer_id: null, attributes: '{"vendor": "APC Metered Rack PDU", "outlets": 24, "amps": 32}', created_at: now, updated_at: now, created_by: adminId },
  ]);
  console.log('  ✓ Extended Assets: 26 additional assets');

  // Extended Asset Relations
  await db.insert(assetRelations).values([
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetMailGwId, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetAdControllerId, target_asset_id: assetEsxi02Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetDnsId, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetProxyId, target_asset_id: assetEsxi02Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetFileServerId, target_asset_id: assetEsxi01Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetGitlabId, target_asset_id: assetEsxi02Id, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetRedisId, target_asset_id: assetK8sClusterId, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetElasticId, target_asset_id: assetK8sClusterId, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetErpId, target_asset_id: assetMysqlId, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetErpId, target_asset_id: assetAdControllerId, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetGitlabId, target_asset_id: assetRedisId, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetCiCdId, target_asset_id: assetGitlabId, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetPrometheusId, target_asset_id: assetK8sClusterId, relation_type: 'runs_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetBackupSrvId, target_asset_id: assetSanId, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetUpsId, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetPduId, target_asset_id: assetRackId, relation_type: 'member_of', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetVpnGwId, target_asset_id: assetFwId, relation_type: 'connected_to', properties: '{}', created_at: now, created_by: adminId },
    { id: uuidv4(), tenant_id: tenantId, source_asset_id: assetFileServerId, target_asset_id: assetSanId, relation_type: 'depends_on', properties: '{}', created_at: now, created_by: adminId },
  ]);
  console.log('  ✓ Extended Relations: 18 additional relations');

  // Asset-Service Links (vertical catalogs → assets)
  await db.insert(assetServiceLinks).values([
    { asset_id: assetErpId, vertical_id: vcBankId, tenant_id: tenantId, effective_from: '2025-01-01', effective_until: null },
    { asset_id: assetWeb01Id, vertical_id: vcAcmeId, tenant_id: tenantId, effective_from: '2025-01-01', effective_until: null },
    { asset_id: assetWeb02Id, vertical_id: vcAcmeId, tenant_id: tenantId, effective_from: '2025-01-01', effective_until: null },
    { asset_id: assetDb01Id, vertical_id: vcMedTechId, tenant_id: tenantId, effective_from: '2025-06-01', effective_until: null },
  ]);
  console.log('  ✓ Asset-Service Links: 4 links');

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
  console.log(`  ✓ Extended Tickets: ${extendedTickets.length} additional tickets`);

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
  console.log('  ✓ Extended Comments: 10 additional comments');

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
  console.log('  ✓ Extended History: 7 additional history entries');

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
  console.log('  ✓ Extended Workflows: 3 templates (Problem-Mgmt, Onboarding, Security IR) + 13 steps');

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
  await db.update(tickets).set({ workflow_instance_id: wiProblem1Id }).where(eq(tickets.id, prbTicketId)).run();
  await db.update(tickets).set({ workflow_instance_id: wiSecurityId }).where(eq(tickets.id, secTicketId)).run();

  console.log('  ✓ Workflow Instances: 2 active (Problem-Mgmt on DNS-Problem, Security IR on Log4j-Patch)');

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
      is_default: 0,
      is_active: 1,
      created_at: now,
      updated_at: now,
    },
  ]);
  console.log('  ✓ SLA Definitions: Gold, Silver (default), Bronze');

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
  console.log('  ✓ SLA Assignments: 3 assignments (DB→Gold, Acme→Gold, Workplace→Bronze)');

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
  console.log('  ✓ Extended SLA Assignments: 9 additional assignments');

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:   admin@opsweave.local / changeme');
  console.log('   Manager: manager@opsweave.local / password123');
  console.log('   Agent:   agent@opsweave.local / password123');
  console.log('   Viewer:  viewer@opsweave.local / password123');
  console.log('\n🌐 Customer Portal credentials:');
  console.log('   Acme Portal User: portal@acme.example.de / changeme');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
