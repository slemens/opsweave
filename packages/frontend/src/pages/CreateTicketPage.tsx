import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useCreateTicket,
  useGroups,
  useCustomers,
  useCategories,
  type CreateTicketPayload,
} from '@/api/tickets';
import type { TicketType, TicketPriority } from '@opsweave/shared';
import {
  TICKET_TYPES,
  TICKET_PRIORITIES,
  TICKET_IMPACTS,
  TICKET_URGENCIES,
  CHANGE_RISK_LIKELIHOODS,
  CHANGE_RISK_IMPACTS,
  CHANGE_RISK_MATRIX,
  calculatePriority,
} from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Risk badge colors (shared with TicketBoardPage)
// ---------------------------------------------------------------------------

const riskBadgeColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300',
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CreateTicketPage() {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const parentId = searchParams.get('parent');
  const typeParam = searchParams.get('type') as TicketType | null;

  const createTicket = useCreateTicket();
  const { data: groupsData, isLoading: groupsLoading } = useGroups();
  const { data: customersData, isLoading: customersLoading } = useCustomers();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();

  // Basic fields
  const [ticketType, setTicketType] = useState<TicketType>(typeParam ?? 'incident');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');

  // Classification
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [impact, setImpact] = useState<string>('');
  const [urgency, setUrgency] = useState<string>('');

  // Assignment
  const [groupId, setGroupId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');

  // Change-specific RFC fields
  const [changeJustification, setChangeJustification] = useState('');
  const [changeImplementation, setChangeImplementation] = useState('');
  const [changeRollback, setChangeRollback] = useState('');
  const [changeRiskLikelihood, setChangeRiskLikelihood] = useState<string>('');
  const [changeRiskImpact, setChangeRiskImpact] = useState<string>('');
  const [changePlannedStart, setChangePlannedStart] = useState('');
  const [changePlannedEnd, setChangePlannedEnd] = useState('');
  const [cabRequired, setCabRequired] = useState(false);

  // Derived
  const groups = groupsData?.data ?? [];
  const customers = (customersData?.data ?? []).filter((c) => c.is_active);
  const categories = (categoriesData ?? []).filter(
    (c) => c.is_active && (c.applies_to === 'all' || c.applies_to === ticketType),
  );

  const autoPriority = (impact && urgency) ? calculatePriority(impact, urgency) : null;
  const effectivePriority = autoPriority ?? priority;

  const autoRisk = (changeRiskLikelihood && changeRiskImpact)
    ? CHANGE_RISK_MATRIX[changeRiskLikelihood]?.[changeRiskImpact] ?? null
    : null;

  const handleSubmit = useCallback(async () => {
    if (title.trim().length < 3) {
      setTitleError(t('validation.title_min_length'));
      return;
    }
    setTitleError('');

    const payload: CreateTicketPayload = {
      ticket_type: ticketType,
      title: title.trim(),
      description: description.trim() || title.trim(),
      priority: effectivePriority,
      source: 'manual',
    };

    if (impact) payload.impact = impact;
    if (urgency) payload.urgency = urgency;
    if (parentId) payload.parent_ticket_id = parentId;
    if (groupId) payload.assignee_group_id = groupId;
    if (customerId) payload.customer_id = customerId;
    if (categoryId) payload.category_id = categoryId;

    // Change-specific RFC fields
    if (ticketType === 'change') {
      if (changeJustification.trim()) payload.change_justification = changeJustification.trim();
      if (changeImplementation.trim()) payload.change_implementation = changeImplementation.trim();
      if (changeRollback.trim()) payload.change_rollback_plan = changeRollback.trim();
      if (changeRiskLikelihood) payload.change_risk_likelihood = changeRiskLikelihood;
      if (changeRiskImpact) payload.change_risk_impact = changeRiskImpact;
      if (changePlannedStart) payload.change_planned_start = new Date(changePlannedStart).toISOString();
      if (changePlannedEnd) payload.change_planned_end = new Date(changePlannedEnd).toISOString();
      if (cabRequired) payload.cab_required = true;
    }

    try {
      const created = await createTicket.mutateAsync(payload);
      toast.success(t('create_success'));
      navigate(`/tickets/${created.id}`);
    } catch (err) {
      console.error('Ticket creation failed:', err);
      toast.error(t('create_error'));
    }
  }, [
    ticketType, title, description, effectivePriority, impact, urgency,
    groupId, customerId, categoryId, parentId,
    changeJustification, changeImplementation, changeRollback,
    changeRiskLikelihood, changeRiskImpact, changePlannedStart, changePlannedEnd, cabRequired,
    createTicket, t, navigate,
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="page-create-ticket">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tickets')} data-testid="btn-back" aria-label={tCommon('actions.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {parentId ? t('parent_child.create_child') : t('create_page.title')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('create_description')}</p>
        </div>
      </div>

      {/* Parent ticket info */}
      {parentId && (
        <div className="rounded-lg bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
          {t('parent_child.linked_to_parent')}{' '}
          <span className="font-mono font-medium text-foreground">{parentId.slice(0, 8)}…</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Main content (2/3 width) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('create_page.section_basic')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ticket Type */}
              <div className="space-y-2">
                <Label htmlFor="ticket-type">{t('fields.type')}</Label>
                <Select
                  value={ticketType}
                  onValueChange={(v) => setTicketType(v as TicketType)}
                  disabled={!!typeParam}
                >
                  <SelectTrigger id="ticket-type" data-testid="select-ticket-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`types.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="ticket-title">{t('fields.title')}</Label>
                <Input
                  id="ticket-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (e.target.value.trim().length >= 3) setTitleError('');
                  }}
                  placeholder={t('placeholder_title')}
                  className={cn(titleError && 'border-destructive focus-visible:ring-destructive')}
                  data-testid="input-title"
                />
                {titleError && (
                  <p className="text-xs text-destructive">{titleError}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="ticket-desc">{t('fields.description')}</Label>
                <Textarea
                  id="ticket-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('placeholder_description')}
                  rows={6}
                  className="resize-none"
                  data-testid="input-description"
                />
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('create_page.section_classification')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('fields.impact')}</Label>
                  <Select value={impact} onValueChange={setImpact}>
                    <SelectTrigger data-testid="select-impact">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_IMPACTS.map((v) => (
                        <SelectItem key={v} value={v}>
                          {t(`impacts.${v}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('fields.urgency')}</Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger data-testid="select-urgency">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_URGENCIES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {t(`urgencies.${v}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>{t('fields.priority')}</Label>
                {autoPriority ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <span className={cn(
                      'h-2 w-2 rounded-full',
                      autoPriority === 'critical' && 'bg-red-500',
                      autoPriority === 'high' && 'bg-orange-500',
                      autoPriority === 'medium' && 'bg-blue-500',
                      autoPriority === 'low' && 'bg-slate-400',
                    )} />
                    {t(`priorities.${autoPriority}`)}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {t('priority_auto_calculated')}
                    </span>
                  </div>
                ) : (
                  <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          <span className="flex items-center gap-2">
                            <span className={cn(
                              'h-2 w-2 rounded-full',
                              p === 'critical' && 'bg-red-500',
                              p === 'high' && 'bg-orange-500',
                              p === 'medium' && 'bg-blue-500',
                              p === 'low' && 'bg-slate-400',
                            )} />
                            {t(`priorities.${p}`)}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* RFC Section — only for changes */}
          {ticketType === 'change' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('create_page.section_rfc')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Justification */}
                <div className="space-y-2">
                  <Label>{t('rfc.justification')}</Label>
                  <Textarea
                    value={changeJustification}
                    onChange={(e) => setChangeJustification(e.target.value)}
                    placeholder={t('rfc.justification_placeholder')}
                    rows={3}
                    className="resize-none"
                    data-testid="input-justification"
                  />
                </div>

                {/* Implementation Plan */}
                <div className="space-y-2">
                  <Label>{t('rfc.implementation')}</Label>
                  <Textarea
                    value={changeImplementation}
                    onChange={(e) => setChangeImplementation(e.target.value)}
                    placeholder={t('rfc.implementation_placeholder')}
                    rows={3}
                    className="resize-none"
                    data-testid="input-implementation"
                  />
                </div>

                {/* Rollback Plan */}
                <div className="space-y-2">
                  <Label>{t('rfc.rollback_plan')}</Label>
                  <Textarea
                    value={changeRollback}
                    onChange={(e) => setChangeRollback(e.target.value)}
                    placeholder={t('rfc.rollback_placeholder')}
                    rows={3}
                    className="resize-none"
                    data-testid="input-rollback"
                  />
                </div>

                <Separator />

                {/* Risk Assessment */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('rfc.risk_matrix_title')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('rfc.risk_likelihood')}</Label>
                    <Select value={changeRiskLikelihood} onValueChange={setChangeRiskLikelihood}>
                      <SelectTrigger data-testid="select-risk-likelihood"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {CHANGE_RISK_LIKELIHOODS.map((l) => (
                          <SelectItem key={l} value={l}>{t(`rfc.likelihoods.${l}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('rfc.risk_impact')}</Label>
                    <Select value={changeRiskImpact} onValueChange={setChangeRiskImpact}>
                      <SelectTrigger data-testid="select-risk-impact"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {CHANGE_RISK_IMPACTS.map((i) => (
                          <SelectItem key={i} value={i}>{t(`rfc.impacts.${i}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {autoRisk && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{t('rfc.risk_level')}:</span>
                    <Badge variant="outline" className={cn('text-xs', riskBadgeColors[autoRisk])}>
                      {t(`rfc.risk_levels.${autoRisk}`)}
                    </Badge>
                  </div>
                )}

                <Separator />

                {/* Planning */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('rfc.planned_start')}</Label>
                    <Input
                      type="datetime-local"
                      value={changePlannedStart}
                      onChange={(e) => setChangePlannedStart(e.target.value)}
                      data-testid="input-planned-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('rfc.planned_end')}</Label>
                    <Input
                      type="datetime-local"
                      value={changePlannedEnd}
                      onChange={(e) => setChangePlannedEnd(e.target.value)}
                      data-testid="input-planned-end"
                    />
                  </div>
                </div>

                <Separator />

                {/* CAB Required */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="cab-required" className="cursor-pointer">
                      {t('rfc.cab_required')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('rfc.cab_required_hint')}
                    </p>
                  </div>
                  <Switch
                    id="cab-required"
                    checked={cabRequired}
                    onCheckedChange={setCabRequired}
                    data-testid="input-cab-required"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Assignment (1/3 width) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('create_page.section_assignment')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Group */}
              <div className="space-y-2">
                <Label>{t('fields.group')}</Label>
                {groupsLoading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger data-testid="select-group">
                      <SelectValue placeholder={t('select_group')} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label>{t('fields.customer')}</Label>
                {customersLoading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger data-testid="select-customer">
                      <SelectValue placeholder={t('select_customer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{t('fields.category')}</Label>
                {categoriesLoading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder={t('select_category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={() => void handleSubmit()} disabled={createTicket.isPending} className="w-full" data-testid="btn-submit">
              {createTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('create')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/tickets')} className="w-full" data-testid="btn-cancel">
              {tCommon('actions.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
