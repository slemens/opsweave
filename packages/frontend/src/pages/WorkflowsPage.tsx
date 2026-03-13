import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  AlertCircle,
  RefreshCw,
  GitBranch,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useWorkflowTemplates,
  useCreateWorkflowTemplate,
  useUpdateWorkflowTemplate,
  useDeleteWorkflowTemplate,
} from '@/api/workflows';
import { useLicenseInfo } from '@/api/settings';
import type { WorkflowListParams, WorkflowTemplateWithSteps } from '@/api/workflows';
import { WORKFLOW_TRIGGER_TYPES, TICKET_TYPES } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const triggerColors: Record<string, string> = {
  ticket_created: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ticket_updated: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  manual: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkflowsPage() {
  const { t } = useTranslation('workflows');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const { data: licenseInfo } = useLicenseInfo();
  const isEnterprise = licenseInfo?.edition === 'enterprise';

  // ── Filter state ──────────────────────────────────────────
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // ── Create dialog ─────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createTriggerType, setCreateTriggerType] = useState<string>('manual');
  const [createTriggerSubtype, setCreateTriggerSubtype] = useState<string>('__none__');
  const [createIsActive, setCreateIsActive] = useState(true);

  // ── Delete dialog ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<WorkflowTemplateWithSteps | null>(null);

  // ── Data ──────────────────────────────────────────────────
  const listParams: WorkflowListParams = useMemo(() => {
    const params: WorkflowListParams = { page, limit: 25 };
    if (activeFilter !== 'all') params.is_active = activeFilter as 'true' | 'false';
    if (triggerFilter !== 'all') params.trigger_type = triggerFilter;
    return params;
  }, [page, activeFilter, triggerFilter]);

  const { data, isLoading, isError, refetch } = useWorkflowTemplates(listParams);
  const createMutation = useCreateWorkflowTemplate();
  const updateMutation = useUpdateWorkflowTemplate();
  const deleteMutation = useDeleteWorkflowTemplate();

  const templates = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.pages ?? 1;
  const totalCount = meta?.total ?? 0;
  const atCommunityLimit = !isEnterprise && totalCount >= 3;

  // ── Handlers ──────────────────────────────────────────────

  const resetCreateForm = useCallback(() => {
    setCreateName('');
    setCreateDescription('');
    setCreateTriggerType('manual');
    setCreateTriggerSubtype('__none__');
    setCreateIsActive(true);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!createName.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: createName.trim(),
        description: createDescription.trim() || null,
        trigger_type: createTriggerType,
        trigger_subtype: createTriggerSubtype !== '__none__' ? createTriggerSubtype : null,
        is_active: createIsActive,
      });
      toast.success(t('create_success'));
      setCreateOpen(false);
      resetCreateForm();
    } catch {
      toast.error(t('create_error'));
    }
  }, [createName, createDescription, createTriggerType, createTriggerSubtype, createIsActive, createMutation, t, resetCreateForm]);

  const handleToggleActive = useCallback(async (tmpl: WorkflowTemplateWithSteps, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updateMutation.mutateAsync({ id: tmpl.id, is_active: !tmpl.is_active });
    } catch {
      toast.error(t('update_error'));
    }
  }, [updateMutation, t]);

  const handleDeleteClick = useCallback((tmpl: WorkflowTemplateWithSteps, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(tmpl);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('delete_success'));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('active')) {
        toast.error(t('delete_blocked'));
      } else {
        toast.error(t('delete_error'));
      }
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, t]);

  const showSubtypeFilter = createTriggerType === 'ticket_created' || createTriggerType === 'ticket_updated';

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-4" data-testid="page-workflows">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          {meta && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('list.showing', { count: meta.total })}
            </p>
          )}
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={atCommunityLimit} data-testid="btn-create-workflow">
          <Plus className="mr-2 h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {/* Community limit banner */}
      {atCommunityLimit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('community_limit')}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={triggerFilter} onValueChange={(v) => { setTriggerFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-8 text-sm" data-testid="select-trigger-filter">
            <SelectValue placeholder={t('filter_all_triggers')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter_all_triggers')}</SelectItem>
            {WORKFLOW_TRIGGER_TYPES.map((tt) => (
              <SelectItem key={tt} value={tt}>{t(`trigger_types.${tt}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px] h-8 text-sm" data-testid="select-active-filter">
            <SelectValue placeholder={t('filter_all_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter_all_status')}</SelectItem>
            <SelectItem value="true">{t('filter_active')}</SelectItem>
            <SelectItem value="false">{t('filter_inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
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
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">{t('no_workflows')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('empty_hint')}</p>
          <Button onClick={() => setCreateOpen(true)} disabled={atCommunityLimit}>
            <Plus className="mr-2 h-4 w-4" />
            {t('create')}
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table data-testid="table-workflows">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('fields.name')}</TableHead>
                  <TableHead>{t('fields.trigger_type')}</TableHead>
                  <TableHead>{t('fields.trigger_subtype')}</TableHead>
                  <TableHead className="text-right">{t('fields.steps')}</TableHead>
                  <TableHead>{t('fields.is_active')}</TableHead>
                  <TableHead>{tCommon('fields.created_at')}</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tmpl) => (
                  <TableRow
                    key={tmpl.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/workflows/${tmpl.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/workflows/${tmpl.id}`); } }}
                    role="button"
                    tabIndex={0}
                    data-testid={`row-workflow-${tmpl.id}`}
                  >
                    <TableCell className="font-medium">{tmpl.name}</TableCell>
                    <TableCell>
                      <Badge className={triggerColors[tmpl.trigger_type] ?? ''} variant="secondary">
                        {t(`trigger_types.${tmpl.trigger_type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {tmpl.trigger_subtype ? (
                        <span className="text-sm capitalize">{tmpl.trigger_subtype}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">{'\u2014'}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tmpl.step_count}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={!!tmpl.is_active}
                        onCheckedChange={() => {}}
                        onClick={(e) => handleToggleActive(tmpl, e)}
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(tmpl.created_at))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteClick(tmpl, e)}
                        aria-label={tCommon('actions.delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground">
                {t('list.page_info', { page, pages: totalPages })}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={tCommon('pagination.previous')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={tCommon('pagination.next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-lg" data-testid="modal-create-workflow">
          <DialogHeader>
            <DialogTitle>{t('create')}</DialogTitle>
            <DialogDescription>{t('empty_hint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wf-name">{t('fields.name')} *</Label>
              <Input
                id="wf-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t('fields.name')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-desc">{t('fields.description')}</Label>
              <Textarea
                id="wf-desc"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={2}
                placeholder={t('fields.description')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('fields.trigger_type')} *</Label>
              <Select value={createTriggerType} onValueChange={(v) => { setCreateTriggerType(v); setCreateTriggerSubtype('__none__'); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_TRIGGER_TYPES.map((tt) => (
                    <SelectItem key={tt} value={tt}>{t(`trigger_types.${tt}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showSubtypeFilter && (
              <div className="space-y-1.5">
                <Label>{t('fields.trigger_subtype')}</Label>
                <Select value={createTriggerSubtype} onValueChange={setCreateTriggerSubtype}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{'\u2014'} {tCommon('fields.optional') || 'Optional'}</SelectItem>
                    {TICKET_TYPES.map((tt) => (
                      <SelectItem key={tt} value={tt} className="capitalize">{tt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch
                id="wf-active"
                checked={createIsActive}
                onCheckedChange={setCreateIsActive}
              />
              <Label htmlFor="wf-active" className="cursor-pointer">{t('fields.is_active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!createName.trim() || createMutation.isPending}
            >
              {tCommon('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm" data-testid="modal-confirm-delete">
          <DialogHeader>
            <DialogTitle>{t('delete_confirm')}</DialogTitle>
            <DialogDescription>{t('delete_confirm_detail')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {tCommon('actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
