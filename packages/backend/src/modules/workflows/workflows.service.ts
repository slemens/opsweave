import { eq, and, count, asc, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { getDb, type TypedDb } from '../../config/database.js';
import {
  workflowTemplates,
  workflowSteps,
  workflowInstances,
  workflowStepInstances,
  tickets,
} from '../../db/schema/index.js';
import { NotFoundError, ConflictError, LicenseLimitError } from '../../lib/errors.js';
import { COMMUNITY_LIMITS } from '@opsweave/shared';
import type {
  WorkflowFilterParams,
  CreateWorkflowTemplateInput,
  UpdateWorkflowTemplateInput,
  CreateWorkflowStepInput,
  ReorderWorkflowStepsInput,
  InstantiateWorkflowInput,
  CompleteWorkflowStepInput,
} from '@opsweave/shared';

function db(): TypedDb {
  return getDb() as TypedDb;
}

const now = () => new Date().toISOString();

// =============================================================================
// Template CRUD
// =============================================================================

export async function listWorkflowTemplates(
  tenantId: string,
  params: WorkflowFilterParams,
): Promise<{ templates: unknown[]; total: number }> {
  const d = db();
  const { page, limit, is_active, trigger_type } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(workflowTemplates.tenant_id, tenantId)];
  if (is_active === 'true') conditions.push(eq(workflowTemplates.is_active, 1));
  if (is_active === 'false') conditions.push(eq(workflowTemplates.is_active, 0));
  if (trigger_type) conditions.push(eq(workflowTemplates.trigger_type, trigger_type));

  const [rows, countResult] = await Promise.all([
    d
      .select()
      .from(workflowTemplates)
      .where(and(...conditions))
      .orderBy(asc(workflowTemplates.name))
      .limit(limit)
      .offset(offset),
    d
      .select({ value: count() })
      .from(workflowTemplates)
      .where(and(...conditions)),
  ]);
  const total = countResult[0]?.value ?? 0;

  // Attach step counts
  const templateIds = rows.map((r) => r.id);
  const stepCounts =
    templateIds.length > 0
      ? await d
          .select({ template_id: workflowSteps.template_id, cnt: count() })
          .from(workflowSteps)
          .where(inArray(workflowSteps.template_id, templateIds))
          .groupBy(workflowSteps.template_id)
      : [];

  const countMap = new Map(stepCounts.map((s) => [s.template_id, s.cnt]));

  const result = rows.map((t) => ({
    ...t,
    is_active: t.is_active === 1,
    step_count: countMap.get(t.id) ?? 0,
  }));

  return { templates: result, total };
}

export async function getWorkflowTemplate(
  tenantId: string,
  id: string,
): Promise<unknown> {
  const d = db();
  const [template] = await d
    .select()
    .from(workflowTemplates)
    .where(and(eq(workflowTemplates.tenant_id, tenantId), eq(workflowTemplates.id, id)));

  if (!template) throw new NotFoundError('Workflow template not found');

  const steps = await d
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.template_id, id))
    .orderBy(asc(workflowSteps.step_order));

  return {
    ...template,
    is_active: template.is_active === 1,
    steps: steps.map((s) => ({
      ...s,
      config: JSON.parse(s.config) as Record<string, unknown>,
    })),
  };
}

export async function createWorkflowTemplate(
  tenantId: string,
  data: CreateWorkflowTemplateInput,
  userId: string,
): Promise<unknown> {
  const d = db();

  // Community limit check
  const countRows = await d
    .select({ value: count() })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.tenant_id, tenantId));
  const total = countRows[0]?.value ?? 0;

  if (total >= COMMUNITY_LIMITS.maxWorkflows) {
    throw new LicenseLimitError(
      `Community Edition is limited to ${COMMUNITY_LIMITS.maxWorkflows} workflow templates`,
    );
  }

  const id = uuidv4();
  const ts = now();
  await d.insert(workflowTemplates).values({
    id,
    tenant_id: tenantId,
    name: data.name,
    description: data.description ?? null,
    trigger_type: data.trigger_type,
    trigger_subtype: data.trigger_subtype ?? null,
    is_active: data.is_active ? 1 : 0,
    version: 1,
    created_by: userId,
    created_at: ts,
    updated_at: ts,
  });

  return getWorkflowTemplate(tenantId, id);
}

export async function updateWorkflowTemplate(
  tenantId: string,
  id: string,
  data: UpdateWorkflowTemplateInput,
  _userId: string,
): Promise<unknown> {
  const d = db();
  const [existing] = await d
    .select()
    .from(workflowTemplates)
    .where(and(eq(workflowTemplates.tenant_id, tenantId), eq(workflowTemplates.id, id)));

  if (!existing) throw new NotFoundError('Workflow template not found');

  const updates: Partial<typeof workflowTemplates.$inferInsert> = { updated_at: now() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.trigger_type !== undefined) updates.trigger_type = data.trigger_type;
  if (data.trigger_subtype !== undefined) updates.trigger_subtype = data.trigger_subtype;
  if (data.is_active !== undefined) updates.is_active = data.is_active ? 1 : 0;

  await d
    .update(workflowTemplates)
    .set(updates)
    .where(and(eq(workflowTemplates.tenant_id, tenantId), eq(workflowTemplates.id, id)));

  return getWorkflowTemplate(tenantId, id);
}

export async function deleteWorkflowTemplate(
  tenantId: string,
  id: string,
): Promise<void> {
  const d = db();
  const [existing] = await d
    .select()
    .from(workflowTemplates)
    .where(and(eq(workflowTemplates.tenant_id, tenantId), eq(workflowTemplates.id, id)));

  if (!existing) throw new NotFoundError('Workflow template not found');

  // Block if active instances exist
  const activeRows = await d
    .select({ value: count() })
    .from(workflowInstances)
    .where(
      and(
        eq(workflowInstances.tenant_id, tenantId),
        eq(workflowInstances.template_id, id),
        eq(workflowInstances.status, 'active'),
      ),
    );
  const activeCount = activeRows[0]?.value ?? 0;

  if (activeCount > 0) {
    throw new ConflictError('Cannot delete template with active workflow instances');
  }

  await d
    .delete(workflowTemplates)
    .where(and(eq(workflowTemplates.tenant_id, tenantId), eq(workflowTemplates.id, id)));
}

// =============================================================================
// Step Management
// =============================================================================

async function assertTemplateOwnership(tenantId: string, templateId: string): Promise<void> {
  const d = db();
  const [template] = await d
    .select({ id: workflowTemplates.id })
    .from(workflowTemplates)
    .where(and(eq(workflowTemplates.tenant_id, tenantId), eq(workflowTemplates.id, templateId)));

  if (!template) throw new NotFoundError('Workflow template not found');
}

export async function addWorkflowStep(
  tenantId: string,
  templateId: string,
  data: CreateWorkflowStepInput,
  _userId: string,
): Promise<unknown> {
  const d = db();
  await assertTemplateOwnership(tenantId, templateId);

  // Determine next step_order
  const stepCountRows = await d
    .select({ value: count() })
    .from(workflowSteps)
    .where(eq(workflowSteps.template_id, templateId));
  const maxOrder = stepCountRows[0]?.value ?? 0;

  const id = uuidv4();
  await d.insert(workflowSteps).values({
    id,
    template_id: templateId,
    name: data.name,
    step_order: maxOrder + 1,
    step_type: data.step_type,
    config: JSON.stringify(data.config ?? {}),
    timeout_hours: data.timeout_hours ?? null,
  });

  // Update template version + updated_at
  const tmplRows = await d
    .select({ v: workflowTemplates.version })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, templateId));
  const currentVersion = tmplRows[0]?.v ?? 1;
  await d
    .update(workflowTemplates)
    .set({ updated_at: now(), version: currentVersion + 1 })
    .where(eq(workflowTemplates.id, templateId));

  return getWorkflowTemplate(tenantId, templateId);
}

export async function removeWorkflowStep(
  tenantId: string,
  templateId: string,
  stepId: string,
): Promise<unknown> {
  const d = db();
  await assertTemplateOwnership(tenantId, templateId);

  const [step] = await d
    .select()
    .from(workflowSteps)
    .where(and(eq(workflowSteps.template_id, templateId), eq(workflowSteps.id, stepId)));

  if (!step) throw new NotFoundError('Workflow step not found');

  await d
    .delete(workflowSteps)
    .where(and(eq(workflowSteps.template_id, templateId), eq(workflowSteps.id, stepId)));

  // Re-number remaining steps
  const remaining = await d
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.template_id, templateId))
    .orderBy(asc(workflowSteps.step_order));

  for (let i = 0; i < remaining.length; i++) {
    const stepId = remaining[i]?.id;
    if (!stepId) continue;
    await d
      .update(workflowSteps)
      .set({ step_order: i + 1 })
      .where(eq(workflowSteps.id, stepId));
  }

  await d
    .update(workflowTemplates)
    .set({ updated_at: now() })
    .where(eq(workflowTemplates.id, templateId));

  return getWorkflowTemplate(tenantId, templateId);
}

export async function reorderWorkflowSteps(
  tenantId: string,
  templateId: string,
  data: ReorderWorkflowStepsInput,
): Promise<unknown> {
  await assertTemplateOwnership(tenantId, templateId);
  const d = db();

  for (let i = 0; i < data.step_ids.length; i++) {
    const stepId = data.step_ids[i];
    if (!stepId) continue;
    await d
      .update(workflowSteps)
      .set({ step_order: i + 1 })
      .where(
        and(eq(workflowSteps.template_id, templateId), eq(workflowSteps.id, stepId)),
      );
  }

  await d
    .update(workflowTemplates)
    .set({ updated_at: now() })
    .where(eq(workflowTemplates.id, templateId));

  return getWorkflowTemplate(tenantId, templateId);
}

// =============================================================================
// Runtime Engine
// =============================================================================

export async function instantiateWorkflow(
  tenantId: string,
  data: InstantiateWorkflowInput,
  userId: string,
): Promise<unknown> {
  const d = db();

  // Verify template belongs to tenant and is active
  const [template] = await d
    .select()
    .from(workflowTemplates)
    .where(
      and(
        eq(workflowTemplates.tenant_id, tenantId),
        eq(workflowTemplates.id, data.template_id),
        eq(workflowTemplates.is_active, 1),
      ),
    );

  if (!template) throw new NotFoundError('Active workflow template not found');

  // Verify ticket belongs to tenant
  const [ticket] = await d
    .select({ id: tickets.id })
    .from(tickets)
    .where(and(eq(tickets.tenant_id, tenantId), eq(tickets.id, data.ticket_id)));

  if (!ticket) throw new NotFoundError('Ticket not found');

  // Check no active instance already exists for this ticket
  const existingRows = await d
    .select({ value: count() })
    .from(workflowInstances)
    .where(
      and(
        eq(workflowInstances.tenant_id, tenantId),
        eq(workflowInstances.ticket_id, data.ticket_id),
        eq(workflowInstances.status, 'active'),
      ),
    );
  const existing = existingRows[0]?.value ?? 0;

  if (existing > 0) {
    throw new ConflictError('A workflow instance is already active for this ticket');
  }

  // Get first step
  const [firstStep] = await d
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.template_id, data.template_id))
    .orderBy(asc(workflowSteps.step_order))
    .limit(1);

  // Create instance
  const instanceId = uuidv4();
  const ts = now();
  await d.insert(workflowInstances).values({
    id: instanceId,
    tenant_id: tenantId,
    template_id: data.template_id,
    ticket_id: data.ticket_id,
    status: 'active',
    started_at: ts,
  });

  // Create first step instance (if steps exist)
  if (firstStep) {
    const stepInstanceId = uuidv4();
    await d.insert(workflowStepInstances).values({
      id: stepInstanceId,
      instance_id: instanceId,
      step_id: firstStep.id,
      status: firstStep.step_type === 'automatic' ? 'in_progress' : 'pending',
      form_data: '{}',
      started_at: firstStep.step_type === 'automatic' ? ts : null,
    });

    // Auto-complete automatic steps immediately
    if (firstStep.step_type === 'automatic') {
      await advanceWorkflow(tenantId, instanceId, stepInstanceId, firstStep, { form_data: {}, next_step_id: null }, userId);
    }
  } else {
    // No steps → complete immediately
    await d
      .update(workflowInstances)
      .set({ status: 'completed', completed_at: ts })
      .where(eq(workflowInstances.id, instanceId));
  }

  return getWorkflowInstance(tenantId, instanceId);
}

export async function getWorkflowInstance(
  tenantId: string,
  instanceId: string,
): Promise<unknown> {
  const d = db();
  const [instance] = await d
    .select()
    .from(workflowInstances)
    .where(
      and(eq(workflowInstances.tenant_id, tenantId), eq(workflowInstances.id, instanceId)),
    );

  if (!instance) throw new NotFoundError('Workflow instance not found');

  // Get step instances with step definitions
  const stepInstances = await d
    .select({
      si_id: workflowStepInstances.id,
      si_status: workflowStepInstances.status,
      si_assigned_to: workflowStepInstances.assigned_to,
      si_assigned_group: workflowStepInstances.assigned_group,
      si_form_data: workflowStepInstances.form_data,
      si_started_at: workflowStepInstances.started_at,
      si_completed_at: workflowStepInstances.completed_at,
      si_completed_by: workflowStepInstances.completed_by,
      s_id: workflowSteps.id,
      s_name: workflowSteps.name,
      s_step_order: workflowSteps.step_order,
      s_step_type: workflowSteps.step_type,
      s_config: workflowSteps.config,
      s_timeout_hours: workflowSteps.timeout_hours,
    })
    .from(workflowStepInstances)
    .leftJoin(workflowSteps, eq(workflowStepInstances.step_id, workflowSteps.id))
    .where(eq(workflowStepInstances.instance_id, instanceId))
    .orderBy(asc(workflowSteps.step_order));

  const [template] = await d
    .select({ name: workflowTemplates.name })
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, instance.template_id));

  return {
    ...instance,
    template_name: template?.name ?? null,
    step_instances: stepInstances.map((si) => ({
      id: si.si_id,
      status: si.si_status,
      assigned_to: si.si_assigned_to,
      assigned_group: si.si_assigned_group,
      form_data: JSON.parse(si.si_form_data) as Record<string, unknown>,
      started_at: si.si_started_at,
      completed_at: si.si_completed_at,
      completed_by: si.si_completed_by,
      step: {
        id: si.s_id,
        name: si.s_name,
        step_order: si.s_step_order,
        step_type: si.s_step_type,
        config: JSON.parse(si.s_config ?? '{}') as Record<string, unknown>,
        timeout_hours: si.s_timeout_hours,
      },
    })),
  };
}

export async function getActiveInstanceForTicket(
  tenantId: string,
  ticketId: string,
): Promise<unknown | null> {
  const d = db();
  const [instance] = await d
    .select()
    .from(workflowInstances)
    .where(
      and(
        eq(workflowInstances.tenant_id, tenantId),
        eq(workflowInstances.ticket_id, ticketId),
        eq(workflowInstances.status, 'active'),
      ),
    );

  if (!instance) return null;
  return getWorkflowInstance(tenantId, instance.id);
}

export async function getInstancesForTicket(
  tenantId: string,
  ticketId: string,
): Promise<unknown[]> {
  const d = db();
  const instances = await d
    .select()
    .from(workflowInstances)
    .where(
      and(
        eq(workflowInstances.tenant_id, tenantId),
        eq(workflowInstances.ticket_id, ticketId),
      ),
    )
    .orderBy(asc(workflowInstances.started_at));

  return Promise.all(instances.map((i) => getWorkflowInstance(tenantId, i.id)));
}

export async function completeWorkflowStep(
  tenantId: string,
  instanceId: string,
  stepInstanceId: string,
  data: CompleteWorkflowStepInput,
  userId: string,
): Promise<unknown> {
  const d = db();

  const [instance] = await d
    .select()
    .from(workflowInstances)
    .where(
      and(eq(workflowInstances.tenant_id, tenantId), eq(workflowInstances.id, instanceId)),
    );

  if (!instance) throw new NotFoundError('Workflow instance not found');
  if (instance.status !== 'active') throw new ConflictError('Workflow instance is not active');

  const [stepInstance] = await d
    .select()
    .from(workflowStepInstances)
    .where(
      and(
        eq(workflowStepInstances.instance_id, instanceId),
        eq(workflowStepInstances.id, stepInstanceId),
      ),
    );

  if (!stepInstance) throw new NotFoundError('Workflow step instance not found');
  if (stepInstance.status === 'completed') throw new ConflictError('Step already completed');

  const [step] = await d
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.id, stepInstance.step_id));

  if (!step) throw new NotFoundError('Workflow step definition not found');

  await advanceWorkflow(tenantId, instanceId, stepInstanceId, step, data, userId);

  return getWorkflowInstance(tenantId, instanceId);
}

async function advanceWorkflow(
  tenantId: string,
  instanceId: string,
  currentStepInstanceId: string,
  currentStep: typeof workflowSteps.$inferSelect,
  data: CompleteWorkflowStepInput,
  userId: string,
): Promise<void> {
  const d = db();
  const ts = now();
  const config = JSON.parse(currentStep.config) as Record<string, unknown>;

  // Mark current step as completed
  await d
    .update(workflowStepInstances)
    .set({
      status: 'completed',
      form_data: JSON.stringify(data.form_data ?? {}),
      completed_at: ts,
      completed_by: userId,
    })
    .where(eq(workflowStepInstances.id, currentStepInstanceId));

  // Determine next step
  let nextStep: typeof workflowSteps.$inferSelect | null = null;

  if (currentStep.step_type === 'routing' || currentStep.step_type === 'condition') {
    // For routing: Agent provides next_step_id in form_data or data.next_step_id
    // For condition: evaluate config
    const nextStepId =
      currentStep.step_type === 'routing'
        ? (data.next_step_id ?? (data.form_data?.next_step_id as string | undefined))
        : evaluateCondition(config, data);

    if (nextStepId) {
      const [found] = await d
        .select()
        .from(workflowSteps)
        .where(
          and(
            eq(workflowSteps.template_id, currentStep.template_id),
            eq(workflowSteps.id, nextStepId),
          ),
        );
      nextStep = found ?? null;
    }
  } else {
    // Linear: next step by step_order
    const allSteps = await d
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.template_id, currentStep.template_id))
      .orderBy(asc(workflowSteps.step_order));

    const currentIdx = allSteps.findIndex((s) => s.id === currentStep.id);
    const candidate = currentIdx >= 0 && currentIdx < allSteps.length - 1
      ? allSteps[currentIdx + 1]
      : undefined;
    nextStep = candidate ?? null;
  }

  if (nextStep) {
    // Create next step instance
    const nextStepInstanceId = uuidv4();
    await d.insert(workflowStepInstances).values({
      id: nextStepInstanceId,
      instance_id: instanceId,
      step_id: nextStep.id,
      status: nextStep.step_type === 'automatic' ? 'in_progress' : 'pending',
      form_data: '{}',
      started_at: nextStep.step_type === 'automatic' ? ts : null,
    });

    // Auto-complete automatic steps recursively
    if (nextStep.step_type === 'automatic') {
      await advanceWorkflow(tenantId, instanceId, nextStepInstanceId, nextStep, { form_data: {}, next_step_id: null }, userId);
    }
  } else {
    // No more steps → complete instance
    await d
      .update(workflowInstances)
      .set({ status: 'completed', completed_at: ts })
      .where(eq(workflowInstances.id, instanceId));
  }
}

function evaluateCondition(
  config: Record<string, unknown>,
  data: CompleteWorkflowStepInput,
): string | null {
  // Simple condition: config.field, config.operator, config.value
  // For now, check form_data against the condition
  const field = config.field as string | undefined;
  const operator = config.operator as string | undefined;
  const value = config.value;
  const nextTrue = config.next_step_id_true as string | undefined;
  const nextFalse = config.next_step_id_false as string | undefined;

  // Optionally use passed next_step_id directly
  if (data.next_step_id) return data.next_step_id;

  if (!field || !operator) return nextFalse ?? null;

  const fieldValue = (data.form_data ?? {})[field];

  let result = false;
  if (operator === 'equals') result = fieldValue === value;
  else if (operator === 'not_equals') result = fieldValue !== value;
  else if (operator === 'contains')
    result = typeof fieldValue === 'string' && fieldValue.includes(String(value));

  return result ? (nextTrue ?? null) : (nextFalse ?? null);
}

export async function cancelWorkflowInstance(
  tenantId: string,
  instanceId: string,
): Promise<unknown> {
  const d = db();
  const [instance] = await d
    .select()
    .from(workflowInstances)
    .where(
      and(eq(workflowInstances.tenant_id, tenantId), eq(workflowInstances.id, instanceId)),
    );

  if (!instance) throw new NotFoundError('Workflow instance not found');
  if (instance.status !== 'active') throw new ConflictError('Workflow instance is not active');

  await d
    .update(workflowInstances)
    .set({ status: 'cancelled', completed_at: now() })
    .where(eq(workflowInstances.id, instanceId));

  return getWorkflowInstance(tenantId, instanceId);
}

// =============================================================================
// Auto-Trigger
// =============================================================================

export async function triggerWorkflowsForTicket(
  tenantId: string,
  ticketId: string,
  triggerType: string,
  ticketType: string,
  userId: string,
): Promise<void> {
  const d = db();

  // Find matching active templates
  const matchingTemplates = await d
    .select()
    .from(workflowTemplates)
    .where(
      and(
        eq(workflowTemplates.tenant_id, tenantId),
        eq(workflowTemplates.trigger_type, triggerType),
        eq(workflowTemplates.is_active, 1),
      ),
    );

  for (const template of matchingTemplates) {
    // If trigger_subtype is set, only trigger for matching ticket type
    if (template.trigger_subtype && template.trigger_subtype !== ticketType) continue;

    try {
      await instantiateWorkflow(
        tenantId,
        { template_id: template.id, ticket_id: ticketId },
        userId,
      );
    } catch {
      // Don't fail ticket creation if workflow fails to instantiate
    }
  }
}

// =============================================================================
// Stats helper for listing instances per template
// =============================================================================

export async function getTemplateInstances(
  tenantId: string,
  templateId: string,
): Promise<unknown[]> {
  const d = db();
  await assertTemplateOwnership(tenantId, templateId);

  const instances = await d
    .select()
    .from(workflowInstances)
    .where(
      and(
        eq(workflowInstances.tenant_id, tenantId),
        eq(workflowInstances.template_id, templateId),
      ),
    )
    .orderBy(asc(workflowInstances.started_at));

  return instances;
}
