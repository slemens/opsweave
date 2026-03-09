import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { tickets } from './tickets.js';

// =============================================================================
// workflow_templates
// =============================================================================

export const workflowTemplates = sqliteTable(
  'workflow_templates',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description'),
    trigger_type: text('trigger_type').notNull(),
    trigger_subtype: text('trigger_subtype'),
    is_active: integer('is_active').notNull().default(1),
    version: integer('version').notNull().default(1),
    created_by: text('created_by').notNull(),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_wt_tenant').on(t.tenant_id),
    index('idx_wt_tenant_active').on(t.tenant_id, t.is_active),
    index('idx_wt_tenant_trigger').on(t.tenant_id, t.trigger_type),
  ],
);

// =============================================================================
// workflow_steps — No tenant_id (tenant-scoped via template FK)
// =============================================================================

export const workflowSteps = sqliteTable(
  'workflow_steps',
  {
    id: text('id').primaryKey(),
    template_id: text('template_id')
      .notNull()
      .references(() => workflowTemplates.id),
    name: text('name').notNull(),
    step_order: integer('step_order').notNull(),
    step_type: text('step_type').notNull(),
    config: text('config').notNull().default('{}'),
    timeout_hours: integer('timeout_hours'),
    next_step_id: text('next_step_id'),
  },
  (t) => [
    index('idx_ws_template').on(t.template_id),
    index('idx_ws_template_order').on(t.template_id, t.step_order),
  ],
);

// =============================================================================
// workflow_instances
// =============================================================================

export const workflowInstances = sqliteTable(
  'workflow_instances',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    template_id: text('template_id')
      .notNull()
      .references(() => workflowTemplates.id),
    ticket_id: text('ticket_id')
      .notNull()
      .references(() => tickets.id),
    status: text('status').notNull().default('active'),
    started_at: text('started_at').notNull(),
    completed_at: text('completed_at'),
  },
  (t) => [
    index('idx_wi_tenant').on(t.tenant_id),
    index('idx_wi_tenant_status').on(t.tenant_id, t.status),
    index('idx_wi_ticket').on(t.tenant_id, t.ticket_id),
  ],
);

// =============================================================================
// workflow_step_instances
// =============================================================================

export const workflowStepInstances = sqliteTable(
  'workflow_step_instances',
  {
    id: text('id').primaryKey(),
    instance_id: text('instance_id')
      .notNull()
      .references(() => workflowInstances.id),
    step_id: text('step_id')
      .notNull()
      .references(() => workflowSteps.id),
    status: text('status').notNull().default('pending'),
    assigned_to: text('assigned_to'),
    assigned_group: text('assigned_group'),
    form_data: text('form_data').notNull().default('{}'),
    started_at: text('started_at'),
    completed_at: text('completed_at'),
    completed_by: text('completed_by'),
  },
  (t) => [
    index('idx_wsi_instance').on(t.instance_id),
    index('idx_wsi_instance_status').on(t.instance_id, t.status),
  ],
);
