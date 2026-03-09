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
  ticketComments,
  ticketHistory,
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

  // ─── Tickets ────────────────────────────────────────────
  const sampleTickets = [
    {
      id: uuidv4(),
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
      customer_id: null,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'gold',
      sla_response_due: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      sla_resolve_due: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
      sla_breached: 0,
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
      asset_id: null,
      assignee_id: agentId,
      assignee_group_id: opsGroupId,
      reporter_id: adminId,
      customer_id: null,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'silver',
      sla_response_due: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      sla_resolve_due: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
      sla_breached: 0,
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
      asset_id: null,
      assignee_id: null,
      assignee_group_id: opsGroupId,
      reporter_id: managerId,
      customer_id: null,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: null,
      sla_response_due: null,
      sla_resolve_due: null,
      sla_breached: 0,
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
      asset_id: null,
      assignee_id: managerId,
      assignee_group_id: devGroupId,
      reporter_id: agentId,
      customer_id: null,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'gold',
      sla_response_due: null,
      sla_resolve_due: null,
      sla_breached: 0,
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
      customer_id: null,
      workflow_instance_id: null,
      current_step_id: null,
      sla_tier: 'bronze',
      sla_response_due: null,
      sla_resolve_due: null,
      sla_breached: 0,
      source: 'portal' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      resolved_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      closed_at: null,
      created_by: viewerId,
    },
  ];

  await db.insert(tickets).values(sampleTickets);
  console.log('  ✓ Tickets: 5 sample tickets (3 incidents, 1 change, 1 problem)');

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
