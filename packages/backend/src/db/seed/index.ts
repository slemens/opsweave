/**
 * OpsWeave — Database Seeder
 *
 * Creates a demo tenant with sample users, groups, and tickets
 * for development and evaluation purposes.
 *
 * Usage: npx tsx src/db/seed/index.ts
 */

import 'dotenv/config';
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
  kbArticles,
  kbArticleLinks,
  regulatoryFrameworks,
  regulatoryRequirements,
  requirementServiceMappings,
  serviceDescriptions,
  horizontalCatalog,
  horizontalCatalogItems,
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
