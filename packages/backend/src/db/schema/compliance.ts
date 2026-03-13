import { sqliteTable, text, index, primaryKey, unique } from 'drizzle-orm/sqlite-core';
import { tenants } from './tenants.js';
import { serviceDescriptions } from './services.js';
import { assets } from './assets.js';
import { users } from './users.js';

// =============================================================================
// regulatory_frameworks
// =============================================================================

export const regulatoryFrameworks = sqliteTable(
  'regulatory_frameworks',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    version: text('version'),
    description: text('description'),
    effective_date: text('effective_date'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_rf_tenant').on(t.tenant_id),
  ],
);

// =============================================================================
// regulatory_requirements
// =============================================================================

export const regulatoryRequirements = sqliteTable(
  'regulatory_requirements',
  {
    id: text('id').primaryKey(),
    framework_id: text('framework_id')
      .notNull()
      .references(() => regulatoryFrameworks.id),
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    index('idx_rr_framework').on(t.framework_id),
    index('idx_rr_framework_category').on(t.framework_id, t.category),
  ],
);

// =============================================================================
// requirement_service_mappings — Junction: requirement <-> service_description
// =============================================================================

export const requirementServiceMappings = sqliteTable(
  'requirement_service_mappings',
  {
    requirement_id: text('requirement_id')
      .notNull()
      .references(() => regulatoryRequirements.id),
    service_desc_id: text('service_desc_id')
      .notNull()
      .references(() => serviceDescriptions.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    coverage_level: text('coverage_level').notNull().default('none'),
    evidence_notes: text('evidence_notes'),
    reviewed_at: text('reviewed_at'),
    reviewed_by: text('reviewed_by'),
    maturity_level: text('maturity_level'), // initial|managed|defined|measured|optimizing
    last_verified: text('last_verified'),
    verified_by: text('verified_by'),
  },
  (t) => [
    primaryKey({ columns: [t.requirement_id, t.service_desc_id] }),
    index('idx_rsm_tenant').on(t.tenant_id),
    index('idx_rsm_requirement').on(t.requirement_id),
    index('idx_rsm_service').on(t.service_desc_id),
  ],
);

// =============================================================================
// asset_regulatory_flags — Junction: asset <-> framework
// =============================================================================

export const assetRegulatoryFlags = sqliteTable(
  'asset_regulatory_flags',
  {
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    framework_id: text('framework_id')
      .notNull()
      .references(() => regulatoryFrameworks.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    reason: text('reason'),
    flagged_at: text('flagged_at').notNull(),
    flagged_by: text('flagged_by').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.asset_id, t.framework_id] }),
    index('idx_arf_tenant').on(t.tenant_id),
    index('idx_arf_asset').on(t.tenant_id, t.asset_id),
    index('idx_arf_framework').on(t.tenant_id, t.framework_id),
  ],
);

// =============================================================================
// compliance_controls (Evo-4A: Compliance Controls)
// =============================================================================

export const complianceControls = sqliteTable(
  'compliance_controls',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category'),
    control_type: text('control_type').notNull().default('preventive'), // preventive|detective|corrective
    status: text('status').notNull().default('planned'), // planned|implemented|verified|not_applicable
    owner_id: text('owner_id').references(() => users.id),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    unique('uq_cc_tenant_code').on(t.tenant_id, t.code),
    index('idx_cc_tenant').on(t.tenant_id),
    index('idx_cc_tenant_status').on(t.tenant_id, t.status),
    index('idx_cc_tenant_category').on(t.tenant_id, t.category),
  ],
);

// =============================================================================
// requirement_control_mappings — cross-framework mapping through shared controls
// =============================================================================

export const requirementControlMappings = sqliteTable(
  'requirement_control_mappings',
  {
    requirement_id: text('requirement_id')
      .notNull()
      .references(() => regulatoryRequirements.id),
    control_id: text('control_id')
      .notNull()
      .references(() => complianceControls.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    coverage: text('coverage').notNull().default('full'), // full|partial|planned
    notes: text('notes'),
  },
  (t) => [
    unique('uq_rcm_req_ctrl').on(t.requirement_id, t.control_id),
    index('idx_rcm_tenant').on(t.tenant_id),
    index('idx_rcm_control').on(t.control_id),
    index('idx_rcm_requirement').on(t.requirement_id),
  ],
);

// =============================================================================
// compliance_audits (Evo-4B: Audit Tracking)
// =============================================================================

export const complianceAudits = sqliteTable(
  'compliance_audits',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    framework_id: text('framework_id')
      .references(() => regulatoryFrameworks.id),
    audit_type: text('audit_type').notNull().default('internal'), // internal|external|certification
    status: text('status').notNull().default('planned'), // planned|in_progress|completed|cancelled
    auditor: text('auditor'),
    start_date: text('start_date'),
    end_date: text('end_date'),
    scope: text('scope'),
    notes: text('notes'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_ca_tenant').on(t.tenant_id),
    index('idx_ca_tenant_status').on(t.tenant_id, t.status),
    index('idx_ca_tenant_framework').on(t.tenant_id, t.framework_id),
  ],
);

// =============================================================================
// audit_findings (Evo-4B: Audit Tracking)
// =============================================================================

export const auditFindings = sqliteTable(
  'audit_findings',
  {
    id: text('id').primaryKey(),
    audit_id: text('audit_id')
      .notNull()
      .references(() => complianceAudits.id),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    control_id: text('control_id')
      .references(() => complianceControls.id),
    requirement_id: text('requirement_id')
      .references(() => regulatoryRequirements.id),
    severity: text('severity').notNull().default('minor'), // critical|major|minor|observation
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('open'), // open|in_remediation|resolved|accepted_risk
    remediation_plan: text('remediation_plan'),
    due_date: text('due_date'),
    resolved_at: text('resolved_at'),
    resolved_by: text('resolved_by'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (t) => [
    index('idx_af_tenant').on(t.tenant_id),
    index('idx_af_audit').on(t.audit_id),
    index('idx_af_tenant_status').on(t.tenant_id, t.status),
    index('idx_af_tenant_severity').on(t.tenant_id, t.severity),
  ],
);

// =============================================================================
// compliance_evidence (Evo-4C: Granular Coverage & Evidence)
// =============================================================================

// =============================================================================
// framework_requirement_mappings — direct requirement-to-requirement cross-mapping
// =============================================================================

export const frameworkRequirementMappings = sqliteTable(
  'framework_requirement_mappings',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    source_requirement_id: text('source_requirement_id')
      .notNull()
      .references(() => regulatoryRequirements.id),
    target_requirement_id: text('target_requirement_id')
      .notNull()
      .references(() => regulatoryRequirements.id),
    mapping_type: text('mapping_type').notNull(), // 'equal', 'partial', 'related'
    notes: text('notes'),
    created_by: text('created_by'),
    created_at: text('created_at').notNull(),
  },
  (t) => [
    unique('uq_frm_tenant_src_tgt').on(t.tenant_id, t.source_requirement_id, t.target_requirement_id),
    index('idx_frm_tenant').on(t.tenant_id),
    index('idx_frm_source').on(t.source_requirement_id),
    index('idx_frm_target').on(t.target_requirement_id),
  ],
);

// =============================================================================
// compliance_evidence (Evo-4C: Granular Coverage & Evidence)
// =============================================================================

export const complianceEvidence = sqliteTable(
  'compliance_evidence',
  {
    id: text('id').primaryKey(),
    tenant_id: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    control_id: text('control_id')
      .notNull()
      .references(() => complianceControls.id),
    evidence_type: text('evidence_type').notNull().default('document'), // document|screenshot|log|report|test_result
    title: text('title').notNull(),
    url: text('url'),
    description: text('description'),
    uploaded_at: text('uploaded_at').notNull(),
    uploaded_by: text('uploaded_by'),
  },
  (t) => [
    index('idx_ce_tenant').on(t.tenant_id),
    index('idx_ce_control').on(t.control_id),
    index('idx_ce_tenant_type').on(t.tenant_id, t.evidence_type),
  ],
);
