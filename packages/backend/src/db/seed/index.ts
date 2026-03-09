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
  assets,
  assetRelations,
  workflowTemplates,
  workflowSteps,
} from '../schema/index.js';

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
    license_key: null,
    is_active: 1,
    created_at: now,
    updated_at: now,
  });
  console.log('  ✓ Tenant: Demo Organisation');

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

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:   admin@opsweave.local / changeme');
  console.log('   Manager: manager@opsweave.local / password123');
  console.log('   Agent:   agent@opsweave.local / password123');
  console.log('   Viewer:  viewer@opsweave.local / password123');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
