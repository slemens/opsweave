import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSlaDefinitions,
  useCreateSlaDefinition,
  useUpdateSlaDefinition,
  useDeleteSlaDefinition,
  useSlaAssignments,
  useCreateSlaAssignment,
  useDeleteSlaAssignment,
} from '@/api/sla';
import type { SlaDefinition } from '@/api/sla';
import { useCustomers } from '@/api/customers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function SlaSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);

  // -- State --
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<SlaDefinition | null>(null);
  const [defName, setDefName] = useState('');
  const [defDescription, setDefDescription] = useState('');
  const [defResponseMin, setDefResponseMin] = useState(60);
  const [defResolutionMin, setDefResolutionMin] = useState(240);
  const [defBusinessHours, setDefBusinessHours] = useState<'24/7' | 'business' | 'extended'>('24/7');
  const [defBhStart, setDefBhStart] = useState('08:00');
  const [defBhEnd, setDefBhEnd] = useState('18:00');
  const [defIsDefault, setDefIsDefault] = useState(false);
  const [defRpoMin, setDefRpoMin] = useState<string>('');
  const [defRtoMin, setDefRtoMin] = useState<string>('');
  const [defAvailabilityPct, setDefAvailabilityPct] = useState<string>('');
  const [defSupportLevel, setDefSupportLevel] = useState<string>('');
  const [defRecoveryClass, setDefRecoveryClass] = useState<string>('');
  const [defBusinessCriticality, setDefBusinessCriticality] = useState<string>('');
  const [defPenaltyClause, setDefPenaltyClause] = useState<string>('');
  const [defContractReference, setDefContractReference] = useState<string>('');
  const [defValidFrom, setDefValidFrom] = useState<string>('');
  const [defValidUntil, setDefValidUntil] = useState<string>('');

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignDefId, setAssignDefId] = useState('');
  const [assignScopeType, setAssignScopeType] = useState<'service' | 'customer' | 'asset'>('customer');
  const [assignScopeId, setAssignScopeId] = useState('');

  // -- Data --
  const { data: definitions, isLoading: defsLoading } = useSlaDefinitions();
  const { data: assignments, isLoading: assignLoading } = useSlaAssignments();
  const createDef = useCreateSlaDefinition();
  const updateDef = useUpdateSlaDefinition();
  const deleteDef = useDeleteSlaDefinition();
  const createAssign = useCreateSlaAssignment();
  const deleteAssign = useDeleteSlaAssignment();

  const { data: customersData } = useCustomers();
  const customerList = customersData?.data ?? [];

  const defList = definitions ?? [];
  const assignList = assignments ?? [];

  // -- Handlers --

  function resetDefForm() {
    setDefName('');
    setDefDescription('');
    setDefResponseMin(60);
    setDefResolutionMin(240);
    setDefBusinessHours('24/7');
    setDefBhStart('08:00');
    setDefBhEnd('18:00');
    setDefIsDefault(false);
    setDefRpoMin('');
    setDefRtoMin('');
    setDefAvailabilityPct('');
    setDefSupportLevel('');
    setDefRecoveryClass('');
    setDefBusinessCriticality('');
    setDefPenaltyClause('');
    setDefContractReference('');
    setDefValidFrom('');
    setDefValidUntil('');
    setEditingDef(null);
  }

  function openEditDef(def: SlaDefinition) {
    setEditingDef(def);
    setDefName(def.name);
    setDefDescription(def.description ?? '');
    setDefResponseMin(def.response_time_minutes);
    setDefResolutionMin(def.resolution_time_minutes);
    setDefBusinessHours(def.business_hours);
    setDefBhStart(def.business_hours_start ?? '08:00');
    setDefBhEnd(def.business_hours_end ?? '18:00');
    setDefIsDefault(!!def.is_default);
    setDefRpoMin(def.rpo_minutes != null ? String(def.rpo_minutes) : '');
    setDefRtoMin(def.rto_minutes != null ? String(def.rto_minutes) : '');
    setDefAvailabilityPct(def.availability_pct ?? '');
    setDefSupportLevel(def.support_level ?? '');
    setDefRecoveryClass(def.recovery_class ?? '');
    setDefBusinessCriticality(def.business_criticality ?? '');
    setDefPenaltyClause(def.penalty_clause ?? '');
    setDefContractReference(def.contract_reference ?? '');
    setDefValidFrom(def.valid_from ?? '');
    setDefValidUntil(def.valid_until ?? '');
    setDefDialogOpen(true);
  }

  async function handleSaveDef() {
    if (!defName.trim()) return;
    const payload = {
      name: defName.trim(),
      description: defDescription.trim() || null,
      response_time_minutes: defResponseMin,
      resolution_time_minutes: defResolutionMin,
      business_hours: defBusinessHours,
      business_hours_start: defBusinessHours !== '24/7' ? defBhStart : null,
      business_hours_end: defBusinessHours !== '24/7' ? defBhEnd : null,
      rpo_minutes: defRpoMin ? Number(defRpoMin) : null,
      rto_minutes: defRtoMin ? Number(defRtoMin) : null,
      availability_pct: defAvailabilityPct.trim() || null,
      support_level: (defSupportLevel || null) as '8x5' | '24x7' | 'best-effort' | null,
      recovery_class: defRecoveryClass.trim() || null,
      business_criticality: (defBusinessCriticality || null) as 'low' | 'medium' | 'high' | 'critical' | null,
      penalty_clause: defPenaltyClause.trim() || null,
      contract_reference: defContractReference.trim() || null,
      valid_from: defValidFrom || null,
      valid_until: defValidUntil || null,
      is_default: defIsDefault,
    };
    try {
      if (editingDef) {
        await updateDef.mutateAsync({ id: editingDef.id, ...payload });
        toast.success(t('settings:sla.update_success'));
      } else {
        await createDef.mutateAsync(payload);
        toast.success(t('settings:sla.create_success'));
      }
      setDefDialogOpen(false);
      resetDefForm();
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDeleteDef(id: string) {
    try {
      await deleteDef.mutateAsync(id);
      toast.success(t('settings:sla.delete_success'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleCreateAssign() {
    if (!assignDefId || !assignScopeId) return;
    const payload = {
      sla_definition_id: assignDefId,
      service_id: assignScopeType === 'service' ? assignScopeId : null,
      customer_id: assignScopeType === 'customer' ? assignScopeId : null,
      asset_id: assignScopeType === 'asset' ? assignScopeId : null,
    };

    try {
      await createAssign.mutateAsync(payload);
      toast.success(t('settings:sla.assignment_success'));
      setAssignDialogOpen(false);
      setAssignDefId('');
      setAssignScopeId('');
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDeleteAssign(id: string) {
    try {
      await deleteAssign.mutateAsync(id);
      toast.success(t('settings:sla.assignment_delete_success'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  if (defsLoading || assignLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="h-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-sla-settings">
      {/* SLA Definitions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('settings:sla.title')}
              </CardTitle>
              <CardDescription>{t('settings:sla.description')}</CardDescription>
            </div>
            <Button size="sm" data-testid="btn-create-sla" onClick={() => { resetDefForm(); setDefDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:sla.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {defList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('settings:sla.empty')}</p>
              <p className="text-xs">{t('settings:sla.empty_hint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {defList.map((def) => (
                <div
                  key={def.id}
                  className="rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => openEditDef(def)}
                  data-testid={`sla-def-${def.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{def.name}</h4>
                        {!!def.is_default && (
                          <Badge variant="secondary" className="text-[10px]">
                            {t('settings:sla.is_default')}
                          </Badge>
                        )}
                        {!def.is_active && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {t('common:status.inactive')}
                          </Badge>
                        )}
                        {def.business_criticality && (
                          <Badge
                            variant={def.business_criticality === 'critical' ? 'destructive' : 'outline'}
                            className="text-[10px]"
                          >
                            {t(`settings:sla.criticality_${def.business_criticality}`)}
                          </Badge>
                        )}
                      </div>
                      {def.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{def.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {t('settings:sla.response_time')}: <Badge variant="outline" className="font-mono text-[10px] ml-0.5">{formatMinutes(def.response_time_minutes)}</Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t('settings:sla.resolution_time')}: <Badge variant="outline" className="font-mono text-[10px] ml-0.5">{formatMinutes(def.resolution_time_minutes)}</Badge>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t(`settings:sla.business_hours_${def.business_hours.replace('/', '_')}`)}
                          {def.business_hours !== '24/7' && def.business_hours_start && ` (${def.business_hours_start}–${def.business_hours_end})`}
                        </span>
                        {def.availability_pct && (
                          <span className="text-xs text-muted-foreground">
                            {t('settings:sla.availability_pct')}: <Badge variant="outline" className="font-mono text-[10px] ml-0.5">{def.availability_pct}%</Badge>
                          </span>
                        )}
                        {def.rpo_minutes != null && (
                          <span className="text-xs text-muted-foreground">
                            RPO: <Badge variant="outline" className="font-mono text-[10px] ml-0.5">{formatMinutes(def.rpo_minutes)}</Badge>
                          </span>
                        )}
                        {def.rto_minutes != null && (
                          <span className="text-xs text-muted-foreground">
                            RTO: <Badge variant="outline" className="font-mono text-[10px] ml-0.5">{formatMinutes(def.rto_minutes)}</Badge>
                          </span>
                        )}
                        {def.support_level && (
                          <span className="text-xs text-muted-foreground">
                            {t('settings:sla.support_level')}: {t(`settings:sla.support_level_${def.support_level.replace('-', '_')}`)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDef(def)} aria-label={t('common:actions.edit')}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label={t('common:actions.delete')}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('settings:sla.delete_confirm')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDef(def.id)}>
                              {t('common:actions.delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SLA Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t('settings:sla.assignments_title')}</CardTitle>
              <CardDescription>{t('settings:sla.assignments_description')}</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              data-testid="btn-create-sla-assignment"
              onClick={() => setAssignDialogOpen(true)}
              disabled={defList.length === 0}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:sla.create_assignment')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignList.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">
              {t('settings:sla.no_assignments')}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table data-testid="table-sla-assignments">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:sla.name')}</TableHead>
                    <TableHead>{t('settings:sla.scope')}</TableHead>
                    <TableHead>{t('settings:sla.priority_label')}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignList.map((a) => {
                    const scopeParts: string[] = [];
                    if (a.asset_name) scopeParts.push(`${t('settings:sla.scope_asset')}: ${a.asset_name}`);
                    if (a.customer_name) scopeParts.push(`${t('settings:sla.scope_customer')}: ${a.customer_name}`);
                    if (a.service_name) scopeParts.push(`${t('settings:sla.scope_service')}: ${a.service_name}`);
                    const scopeLabel = scopeParts.join(' + ') || '—';

                    const def = defList.find((d) => d.id === a.sla_definition_id);

                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{def?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm">{scopeLabel}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-mono">{a.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label={t('common:actions.delete')}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('settings:sla.delete_assignment_confirm')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAssign(a.id)}>
                                  {t('common:actions.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Definition Dialog */}
      <Dialog open={defDialogOpen} onOpenChange={(open) => { setDefDialogOpen(open); if (!open) resetDefForm(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="modal-sla-definition">
          <DialogHeader>
            <DialogTitle>
              {editingDef ? t('settings:sla.edit') : t('settings:sla.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:sla.name')}</Label>
              <Input data-testid="input-sla-name" value={defName} onChange={(e) => setDefName(e.target.value)} placeholder="z.B. Gold 24/7" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:sla.description_field')}</Label>
              <Input value={defDescription} onChange={(e) => setDefDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('settings:sla.response_time')} ({t('settings:sla.minutes')})</Label>
                <Input type="number" min={1} value={defResponseMin} onChange={(e) => setDefResponseMin(Number(e.target.value))} />
              </div>
              <div className="grid gap-2">
                <Label>{t('settings:sla.resolution_time')} ({t('settings:sla.minutes')})</Label>
                <Input type="number" min={1} value={defResolutionMin} onChange={(e) => setDefResolutionMin(Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('settings:sla.rpo')} ({t('settings:sla.minutes')})</Label>
                <Input type="number" min={0} value={defRpoMin} onChange={(e) => setDefRpoMin(e.target.value)} placeholder={t('settings:sla.optional')} />
              </div>
              <div className="grid gap-2">
                <Label>{t('settings:sla.rto')} ({t('settings:sla.minutes')})</Label>
                <Input type="number" min={0} value={defRtoMin} onChange={(e) => setDefRtoMin(e.target.value)} placeholder={t('settings:sla.optional')} />
              </div>
            </div>
            {/* Service Levels Section */}
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {t('settings:sla.section_service_levels')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('settings:sla.availability_pct')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={defAvailabilityPct}
                    onChange={(e) => setDefAvailabilityPct(e.target.value)}
                    placeholder="99.9"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('settings:sla.support_level')}</Label>
                  <Select value={defSupportLevel || '__none__'} onValueChange={(v) => setDefSupportLevel(v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{'\u2014'}</SelectItem>
                      <SelectItem value="8x5">{t('settings:sla.support_level_8x5')}</SelectItem>
                      <SelectItem value="24x7">{t('settings:sla.support_level_24x7')}</SelectItem>
                      <SelectItem value="best-effort">{t('settings:sla.support_level_best_effort')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="grid gap-2">
                  <Label>{t('settings:sla.recovery_class')}</Label>
                  <Input
                    value={defRecoveryClass}
                    onChange={(e) => setDefRecoveryClass(e.target.value)}
                    placeholder={t('settings:sla.optional')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('settings:sla.business_criticality')}</Label>
                  <Select value={defBusinessCriticality || '__none__'} onValueChange={(v) => setDefBusinessCriticality(v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{'\u2014'}</SelectItem>
                      <SelectItem value="low">{t('settings:sla.criticality_low')}</SelectItem>
                      <SelectItem value="medium">{t('settings:sla.criticality_medium')}</SelectItem>
                      <SelectItem value="high">{t('settings:sla.criticality_high')}</SelectItem>
                      <SelectItem value="critical">{t('settings:sla.criticality_critical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contract Section */}
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {t('settings:sla.section_contract')}
              </p>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>{t('settings:sla.contract_reference')}</Label>
                  <Input
                    value={defContractReference}
                    onChange={(e) => setDefContractReference(e.target.value)}
                    placeholder={t('settings:sla.optional')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('settings:sla.penalty_clause')}</Label>
                  <Textarea
                    value={defPenaltyClause}
                    onChange={(e) => setDefPenaltyClause(e.target.value)}
                    placeholder={t('settings:sla.optional')}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Validity Section */}
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                {t('settings:sla.section_validity')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('settings:sla.valid_from')}</Label>
                  <Input
                    type="date"
                    value={defValidFrom}
                    onChange={(e) => setDefValidFrom(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('settings:sla.valid_until')}</Label>
                  <Input
                    type="date"
                    value={defValidUntil}
                    onChange={(e) => setDefValidUntil(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t('settings:sla.business_hours')}</Label>
              <Select value={defBusinessHours} onValueChange={(v) => setDefBusinessHours(v as '24/7' | 'business' | 'extended')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24/7">{t('settings:sla.business_hours_24_7')}</SelectItem>
                  <SelectItem value="business">{t('settings:sla.business_hours_business')}</SelectItem>
                  <SelectItem value="extended">{t('settings:sla.business_hours_extended')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {defBusinessHours !== '24/7' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('settings:sla.business_hours_start')}</Label>
                  <Input type="time" value={defBhStart} onChange={(e) => setDefBhStart(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('settings:sla.business_hours_end')}</Label>
                  <Input type="time" value={defBhEnd} onChange={(e) => setDefBhEnd(e.target.value)} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sla-default"
                checked={defIsDefault}
                onChange={(e) => setDefIsDefault(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="sla-default" className="text-sm font-normal">
                {t('settings:sla.is_default')}
                <span className="text-muted-foreground ml-1 text-xs">— {t('settings:sla.is_default_hint')}</span>
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDefDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button data-testid="btn-save-sla" onClick={handleSaveDef} disabled={!defName.trim() || createDef.isPending || updateDef.isPending}>
              {createDef.isPending || updateDef.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="modal-sla-assignment">
          <DialogHeader>
            <DialogTitle>{t('settings:sla.create_assignment')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:sla.name')}</Label>
              <Select value={assignDefId} onValueChange={setAssignDefId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {defList.filter((d) => !!d.is_active).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({formatMinutes(d.response_time_minutes)} / {formatMinutes(d.resolution_time_minutes)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:sla.scope')}</Label>
              <Select value={assignScopeType} onValueChange={(v) => { setAssignScopeType(v as 'service' | 'customer' | 'asset'); setAssignScopeId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">{t('settings:sla.scope_customer')}</SelectItem>
                  <SelectItem value="asset">{t('settings:sla.scope_asset')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t(`settings:sla.scope_${assignScopeType}`)}</Label>
              {assignScopeType === 'customer' ? (
                <Select value={assignScopeId} onValueChange={setAssignScopeId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {customerList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Asset UUID"
                  value={assignScopeId}
                  onChange={(e) => setAssignScopeId(e.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              data-testid="btn-save-sla-assignment"
              onClick={handleCreateAssign}
              disabled={!assignDefId || !assignScopeId || createAssign.isPending}
            >
              {createAssign.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
