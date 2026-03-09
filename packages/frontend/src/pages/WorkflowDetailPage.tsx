import 'reactflow/dist/style.css';
import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactFlow, { type Node, type Edge, Background, Controls, MarkerType } from 'reactflow';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  GripVertical,
  Plus,
  Trash2,
  GitBranch,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  useWorkflowTemplate,
  useUpdateWorkflowTemplate,
  useAddWorkflowStep,
  useRemoveWorkflowStep,
  useReorderWorkflowSteps,
  useTemplateInstances,
} from '@/api/workflows';
import type { WorkflowStepWithConfig } from '@/api/workflows';
import { WORKFLOW_TRIGGER_TYPES, WORKFLOW_STEP_TYPES, TICKET_TYPES } from '@opsweave/shared';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const stepTypeColors: Record<string, string> = {
  form: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  routing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  condition: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  automatic: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const instanceStatusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const configPlaceholders: Record<string, string> = {
  form: '{\n  "fields": [\n    { "name": "summary", "label": "Summary", "type": "text", "required": true }\n  ]\n}',
  approval: '{\n  "approver_group_id": "group-uuid",\n  "require_all": false\n}',
  routing: '{\n  "options": [\n    { "label": "Escalate", "next_step_id": null },\n    { "label": "Resolve", "next_step_id": null }\n  ]\n}',
  condition: '{\n  "field": "priority",\n  "operator": "eq",\n  "value": "critical",\n  "next_step_id_true": null,\n  "next_step_id_false": null\n}',
  automatic: '{\n  "action": "set_status",\n  "params": { "status": "in_progress" }\n}',
};

// ---------------------------------------------------------------------------
// Sortable Step Card
// ---------------------------------------------------------------------------

interface SortableStepCardProps {
  step: WorkflowStepWithConfig;
  index: number;
  onRemove: (stepId: string) => void;
  isRemoving: boolean;
  tWf: (key: string, opts?: Record<string, unknown>) => string;
}

function SortableStepCard({ step, index, onRemove, isRemoving, tWf }: SortableStepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-start gap-3 rounded-lg border bg-card p-3', isDragging && 'shadow-lg')}>
      {/* Drag handle */}
      <button
        className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
        title={tWf('steps.drag_to_reorder')}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Step number */}
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{step.name}</span>
          <Badge className={cn('text-xs shrink-0', stepTypeColors[step.step_type])} variant="secondary">
            {tWf(`step_types.${step.step_type}`)}
          </Badge>
        </div>
        {step.timeout_hours && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {step.timeout_hours}h
          </div>
        )}
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        disabled={isRemoving}
        onClick={() => onRemove(step.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flow Visualization
// ---------------------------------------------------------------------------

function WorkflowFlowView({ steps }: { steps: WorkflowStepWithConfig[] }) {
  const nodes: Node[] = steps.map((step, i) => ({
    id: step.id,
    position: { x: 250, y: i * 120 },
    data: { label: step.name, type: step.step_type },
    type: 'default',
    style: {
      background: '#fff',
      border: '1.5px solid #e2e8f0',
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: 13,
      width: 200,
      color: '#1e293b',
    },
  }));

  const edges: Edge[] = steps.slice(0, -1).map((step, i) => ({
    id: `e${i}`,
    source: step.id,
    target: steps[i + 1]!.id,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { strokeWidth: 1.5, stroke: '#94a3b8' },
  }));

  if (steps.length === 0) return null;

  return (
    <div className="h-[500px] rounded-lg border overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="#f1f5f9" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t: tWf } = useTranslation('workflows');
  const { t: tCommon } = useTranslation('common');

  // ── Data ──────────────────────────────────────────────────
  const { data: template, isLoading, isError, refetch } = useWorkflowTemplate(id);
  const { data: instances } = useTemplateInstances(id);

  const updateMutation = useUpdateWorkflowTemplate();
  const addStepMutation = useAddWorkflowStep();
  const removeStepMutation = useRemoveWorkflowStep();
  const reorderMutation = useReorderWorkflowSteps();

  // ── Add Step Dialog ───────────────────────────────────────
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [stepName, setStepName] = useState('');
  const [stepType, setStepType] = useState<string>('form');
  const [stepConfig, setStepConfig] = useState('{}');
  const [stepTimeout, setStepTimeout] = useState('');
  const [configError, setConfigError] = useState('');

  // ── Remove confirm dialog ─────────────────────────────────
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  // ── Sensors for dnd-kit ───────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const steps = useMemo(() => template?.steps ?? [], [template]);
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);

  // ── Handlers ──────────────────────────────────────────────

  const handleFieldChange = useCallback(async (field: string, value: unknown) => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, [field]: value });
    } catch {
      toast.error(tWf('update_error'));
    }
  }, [id, updateMutation, tWf]);

  const resetAddStep = useCallback(() => {
    setStepName('');
    setStepType('form');
    setStepConfig('{}');
    setStepTimeout('');
    setConfigError('');
  }, []);

  const handleAddStep = useCallback(async () => {
    if (!id || !stepName.trim()) return;
    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(stepConfig || '{}') as Record<string, unknown>;
    } catch {
      setConfigError('Invalid JSON');
      return;
    }
    try {
      await addStepMutation.mutateAsync({
        templateId: id,
        name: stepName.trim(),
        step_type: stepType,
        config: parsedConfig,
        timeout_hours: stepTimeout ? parseInt(stepTimeout, 10) : null,
      });
      toast.success(tWf('steps.add'));
      setAddStepOpen(false);
      resetAddStep();
    } catch {
      toast.error(tWf('update_error'));
    }
  }, [id, stepName, stepType, stepConfig, stepTimeout, addStepMutation, tWf, resetAddStep]);

  const handleRemoveStep = useCallback(async () => {
    if (!id || !removeTarget) return;
    try {
      await removeStepMutation.mutateAsync({ templateId: id, stepId: removeTarget });
      toast.success(tWf('steps.remove'));
      setRemoveTarget(null);
    } catch {
      toast.error(tWf('update_error'));
    }
  }, [id, removeTarget, removeStepMutation, tWf]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !id) return;

    const oldIndex = stepIds.indexOf(active.id as string);
    const newIndex = stepIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...stepIds];
    const [moved] = newOrder.splice(oldIndex, 1);
    if (moved) newOrder.splice(newIndex, 0, moved);

    try {
      await reorderMutation.mutateAsync({ templateId: id, step_ids: newOrder });
    } catch {
      toast.error(tWf('update_error'));
    }
  }, [id, stepIds, reorderMutation, tWf]);

  // ── Loading / Error ───────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium mb-1">{tCommon('status.error')}</p>
        <p className="text-sm text-muted-foreground mb-4">{tCommon('errors.generic')}</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {tCommon('actions.retry')}
        </Button>
      </div>
    );
  }

  const instanceList = instances ?? [];

  return (
    <div className="space-y-4">
      {/* Back nav */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')} className="-ml-2 text-muted-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {tWf('title')}
      </Button>

      <div className="flex items-start gap-2">
        <h2 className="text-2xl font-bold tracking-tight flex-1 truncate">{template.name}</h2>
        {template.is_active ? (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" variant="secondary">
            {tWf('list.active')}
          </Badge>
        ) : (
          <Badge variant="secondary">{tWf('list.inactive')}</Badge>
        )}
      </div>

      {template.description && (
        <p className="text-sm text-muted-foreground">{template.description}</p>
      )}

      {/* Layout */}
      <div className="grid grid-cols-3 gap-6 items-start">
        {/* Left — Tabs */}
        <div className="col-span-2">
          <Tabs defaultValue="steps">
            <TabsList>
              <TabsTrigger value="steps">{tWf('tabs.steps')}</TabsTrigger>
              <TabsTrigger value="flow">{tWf('tabs.flow')}</TabsTrigger>
              <TabsTrigger value="instances">{tWf('tabs.instances')}</TabsTrigger>
            </TabsList>

            {/* Steps Tab */}
            <TabsContent value="steps" className="mt-4 space-y-3">
              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
                  <GitBranch className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium mb-1">{tWf('steps.no_steps')}</p>
                  <p className="text-sm text-muted-foreground mb-4">{tWf('steps.no_steps_hint')}</p>
                  <Button size="sm" onClick={() => setAddStepOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    {tWf('steps.add')}
                  </Button>
                </div>
              ) : (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {steps.map((step, i) => (
                          <SortableStepCard
                            key={step.id}
                            step={step}
                            index={i}
                            onRemove={(sid) => setRemoveTarget(sid)}
                            isRemoving={removeStepMutation.isPending}
                            tWf={tWf}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <Button variant="outline" size="sm" onClick={() => setAddStepOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    {tWf('steps.add')}
                  </Button>
                </>
              )}
            </TabsContent>

            {/* Flow Tab */}
            <TabsContent value="flow" className="mt-4">
              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
                  <GitBranch className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">{tWf('steps.no_steps_hint')}</p>
                </div>
              ) : (
                <WorkflowFlowView steps={steps} />
              )}
            </TabsContent>

            {/* Instances Tab */}
            <TabsContent value="instances" className="mt-4">
              {instanceList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">{tWf('instances.no_instances')}</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">{tWf('instances.started_at')}</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">{tWf('instances.completed_at')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {instanceList.map((inst) => (
                        <tr key={inst.id} className="border-b last:border-0">
                          <td className="px-3 py-2">
                            <Badge className={instanceStatusColors[inst.status] ?? ''} variant="secondary">
                              {tWf(`instance_statuses.${inst.status}`)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {inst.started_at
                              ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(inst.started_at))
                              : '\u2014'}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {inst.completed_at
                              ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(inst.completed_at))
                              : '\u2014'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right — Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{tWf('detail')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trigger Type */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tWf('fields.trigger_type')}</Label>
                <Select
                  value={template.trigger_type}
                  onValueChange={(v) => handleFieldChange('trigger_type', v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKFLOW_TRIGGER_TYPES.map((tt) => (
                      <SelectItem key={tt} value={tt}>{tWf(`trigger_types.${tt}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trigger Subtype */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{tWf('fields.trigger_subtype')}</Label>
                <Select
                  value={template.trigger_subtype ?? '__none__'}
                  onValueChange={(v) => handleFieldChange('trigger_subtype', v === '__none__' ? null : v)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{'\u2014'}</SelectItem>
                    {TICKET_TYPES.map((tt) => (
                      <SelectItem key={tt} value={tt} className="capitalize">{tt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm">{tWf('fields.is_active')}</span>
                <Switch
                  checked={!!template.is_active}
                  onCheckedChange={(v) => handleFieldChange('is_active', v)}
                  disabled={updateMutation.isPending}
                />
              </div>

              <Separator />

              {/* Meta */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tWf('fields.steps')}</span>
                  <span className="font-medium">{steps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tWf('fields.version')}</span>
                  <span className="font-medium">{template.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tCommon('fields.created_at')}</span>
                  <span className="text-xs">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(template.created_at))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{tCommon('fields.updated_at')}</span>
                  <span className="text-xs">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(template.updated_at))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Step Dialog */}
      <Dialog open={addStepOpen} onOpenChange={(open) => { setAddStepOpen(open); if (!open) resetAddStep(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tWf('steps.add')}</DialogTitle>
            <DialogDescription>{tWf('fields.step_name')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="step-name">{tWf('fields.step_name')} *</Label>
              <Input
                id="step-name"
                value={stepName}
                onChange={(e) => setStepName(e.target.value)}
                placeholder={tWf('fields.step_name')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tWf('fields.step_type')} *</Label>
              <Select value={stepType} onValueChange={(v) => { setStepType(v); setStepConfig('{}'); setConfigError(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_STEP_TYPES.map((st) => (
                    <SelectItem key={st} value={st}>{tWf(`step_types.${st}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="step-timeout">{tWf('fields.timeout_hours')}</Label>
              <Input
                id="step-timeout"
                type="number"
                min="1"
                value={stepTimeout}
                onChange={(e) => setStepTimeout(e.target.value)}
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="step-config">{tWf('fields.config')} (JSON)</Label>
              <Textarea
                id="step-config"
                value={stepConfig}
                onChange={(e) => { setStepConfig(e.target.value); setConfigError(''); }}
                rows={6}
                className={cn('font-mono text-xs', configError && 'border-destructive')}
                placeholder={configPlaceholders[stepType]}
              />
              {configError && (
                <p className="text-xs text-destructive">{configError}</p>
              )}
              {stepType !== 'form' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => setStepConfig(configPlaceholders[stepType] ?? '{}')}
                >
                  Insert template
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddStepOpen(false); resetAddStep(); }}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              onClick={handleAddStep}
              disabled={!stepName.trim() || addStepMutation.isPending}
            >
              {tCommon('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Step Confirm Dialog */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tWf('steps.remove')}</DialogTitle>
            <DialogDescription>{tWf('steps.remove_confirm')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveStep}
              disabled={removeStepMutation.isPending}
            >
              {tCommon('actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
