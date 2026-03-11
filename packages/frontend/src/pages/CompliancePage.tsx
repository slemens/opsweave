import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ControlsTab } from '@/components/compliance/ControlsTab';
import { AuditsTab } from '@/components/compliance/AuditsTab';
import { EvidenceTab } from '@/components/compliance/EvidenceTab';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useFrameworks,
  useRequirements,
  useMatrix,
  useCreateFramework,
  useUpdateFramework,
  useDeleteFramework,
  useCreateRequirement,
  useUpdateRequirement,
  useDeleteRequirement,
  useUpsertMapping,
} from '@/api/compliance';
import type {
  RegulatoryFramework,
  RegulatoryRequirement,
  RequirementMapping,
  CreateFrameworkPayload,
  CreateRequirementPayload,
  UpsertMappingPayload,
} from '@/api/compliance';
import { useServiceDescriptions } from '@/api/services';
import { useLicenseInfo } from '@/api/settings';

// =============================================================================
// Constants
// =============================================================================

const COMMUNITY_FRAMEWORK_LIMIT = 1;

const COVERAGE_CONFIG: Record<
  RequirementMapping['coverage_level'],
  { labelKey: string; className: string; icon: React.ReactNode }
> = {
  full: {
    labelKey: 'coverage_levels.full',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  partial: {
    labelKey: 'coverage_levels.partial',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  none: {
    labelKey: 'coverage_levels.none',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: <XCircle className="h-3 w-3" />,
  },
  not_applicable: {
    labelKey: 'coverage_levels.not_applicable',
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    icon: <ChevronDown className="h-3 w-3" />,
  },
};

// =============================================================================
// Sub-components
// =============================================================================

function CoverageBadge({
  level,
}: {
  level: RequirementMapping['coverage_level'] | undefined;
}) {
  const { t } = useTranslation('compliance');
  if (!level) return null;
  const cfg = COVERAGE_CONFIG[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.icon}
      {t(cfg.labelKey)}
    </span>
  );
}

function FrameworkSelector({
  frameworks,
  selectedId,
  onSelect,
  placeholder,
}: {
  frameworks: RegulatoryFramework[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={selectedId ?? ''} onValueChange={onSelect}>
      <SelectTrigger className="w-72 dark:bg-slate-800 dark:border-slate-700">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
        {frameworks.map((fw) => (
          <SelectItem key={fw.id} value={fw.id}>
            <span className="font-medium">{fw.name}</span>
            {fw.version && (
              <span className="ml-2 text-slate-400 text-xs">{fw.version}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-800">
        <ShieldCheck className="h-8 w-8 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{message}</p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <TableRow key={i} className="animate-pulse">
          {[...Array(cols)].map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full dark:bg-slate-700" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// =============================================================================
// Framework Dialog
// =============================================================================

interface FrameworkDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: RegulatoryFramework | null;
}

function FrameworkDialog({ open, onClose, initial }: FrameworkDialogProps) {
  const { t } = useTranslation('compliance');
  const { t: tCommon } = useTranslation('common');
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [version, setVersion] = useState(initial?.version ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [effectiveDate, setEffectiveDate] = useState(
    initial?.effective_date ? initial.effective_date.slice(0, 10) : '',
  );

  const createMutation = useCreateFramework();
  const updateMutation = useUpdateFramework();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function resetForm() {
    setName('');
    setVersion('');
    setDescription('');
    setEffectiveDate('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const payload: CreateFrameworkPayload = {
      name: name.trim(),
      version: version.trim() || null,
      description: description.trim() || null,
      effective_date: effectiveDate || null,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: initial.id, ...payload });
        toast.success(tCommon('saved'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(tCommon('created'));
      }
      handleClose();
    } catch {
      toast.error(tCommon('error'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            {isEdit
              ? t('dialogs.edit_framework.title')
              : t('dialogs.create_framework.title')}
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            {isEdit
              ? t('dialogs.edit_framework.description')
              : t('dialogs.create_framework.description')}
          </DialogDescription>
        </DialogHeader>

        <form id="framework-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.name')} *</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ISO 27001"
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.version')}</Label>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="2022"
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.effective_date')}</Label>
            <Input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:[color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {tCommon('cancel')}
          </Button>
          <Button type="submit" form="framework-form" disabled={isPending || !name.trim()}>
            {isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Requirement Dialog
// =============================================================================

interface RequirementDialogProps {
  open: boolean;
  onClose: () => void;
  frameworkId: string;
  initial?: RegulatoryRequirement | null;
}

function RequirementDialog({ open, onClose, frameworkId, initial }: RequirementDialogProps) {
  const { t } = useTranslation('compliance');
  const { t: tCommon } = useTranslation('common');
  const isEdit = !!initial;

  const [code, setCode] = useState(initial?.code ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const createMutation = useCreateRequirement();
  const updateMutation = useUpdateRequirement();
  const isPending = createMutation.isPending || updateMutation.isPending;

  function resetForm() {
    setCode('');
    setTitle('');
    setCategory('');
    setDescription('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;

    const payload: CreateRequirementPayload = {
      code: code.trim(),
      title: title.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ rid: initial.id, frameworkId, ...payload });
        toast.success(tCommon('saved'));
      } else {
        await createMutation.mutateAsync({ frameworkId, ...payload });
        toast.success(tCommon('created'));
      }
      handleClose();
    } catch {
      toast.error(tCommon('error'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            {isEdit
              ? t('dialogs.edit_requirement.title')
              : t('dialogs.create_requirement.title')}
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            {isEdit
              ? t('dialogs.edit_requirement.description')
              : t('dialogs.create_requirement.description')}
          </DialogDescription>
        </DialogHeader>

        <form id="requirement-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.code')} *</Label>
            <Input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="A.5.1"
              className="font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.title')} *</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.category')}</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Access Control"
              className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            form="requirement-form"
            disabled={isPending || !code.trim() || !title.trim()}
          >
            {isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Coverage Dialog
// =============================================================================

interface CoverageDialogProps {
  open: boolean;
  onClose: () => void;
  requirement: (RegulatoryRequirement & { mappings: RequirementMapping[] }) | null;
  frameworkId: string;
  serviceDescriptions: Array<{ id: string; code: string; title: string }>;
}

function CoverageDialog({
  open,
  onClose,
  requirement,
  frameworkId,
  serviceDescriptions,
}: CoverageDialogProps) {
  const { t } = useTranslation('compliance');
  const { t: tCommon } = useTranslation('common');

  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [coverageLevel, setCoverageLevel] = useState<RequirementMapping['coverage_level']>('full');
  const [evidenceNotes, setEvidenceNotes] = useState('');

  const upsertMutation = useUpsertMapping();

  function handleClose() {
    setSelectedServiceId('');
    setCoverageLevel('full');
    setEvidenceNotes('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requirement || !selectedServiceId) return;

    const payload: UpsertMappingPayload = {
      coverage_level: coverageLevel,
      evidence_notes: evidenceNotes.trim() || null,
    };

    try {
      await upsertMutation.mutateAsync({
        rid: requirement.id,
        sid: selectedServiceId,
        frameworkId,
        ...payload,
      });
      toast.success(tCommon('saved'));
      handleClose();
    } catch {
      toast.error(tCommon('error'));
    }
  }

  const existingMapping = useMemo(
    () => requirement?.mappings.find((m) => m.service_desc_id === selectedServiceId),
    [requirement, selectedServiceId],
  );

  // Pre-fill when service already has a mapping
  function handleServiceChange(id: string) {
    setSelectedServiceId(id);
    const existing = requirement?.mappings.find((m) => m.service_desc_id === id);
    if (existing) {
      setCoverageLevel(existing.coverage_level);
      setEvidenceNotes(existing.evidence_notes ?? '');
    } else {
      setCoverageLevel('full');
      setEvidenceNotes('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            {t('dialogs.set_coverage.title')}
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            {requirement && (
              <span className="font-mono text-xs text-blue-400">{requirement.code}</span>
            )}{' '}
            {t('dialogs.set_coverage.description')}
          </DialogDescription>
        </DialogHeader>

        <form
          id="coverage-form"
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 py-2"
        >
          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">Service *</Label>
            <Select value={selectedServiceId} onValueChange={handleServiceChange}>
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue placeholder="Service auswählen" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                {serviceDescriptions.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    <span className="font-mono text-xs text-blue-400 mr-2">{svc.code}</span>
                    {svc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {existingMapping && (
              <p className="text-xs text-amber-400">
                {tCommon('existing_value')}: {t(`coverage_levels.${existingMapping.coverage_level}`)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.coverage_level')} *</Label>
            <Select
              value={coverageLevel}
              onValueChange={(v) => setCoverageLevel(v as RequirementMapping['coverage_level'])}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                {(
                  ['full', 'partial', 'none', 'not_applicable'] as RequirementMapping['coverage_level'][]
                ).map((level) => (
                  <SelectItem key={level} value={level}>
                    <CoverageBadge level={level} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-300">{t('fields.evidence_notes')}</Label>
            <Textarea
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              rows={3}
              placeholder="Dokumentennummern, Links, Kontrollreferenzen…"
              className="resize-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="submit"
            form="coverage-form"
            disabled={upsertMutation.isPending || !selectedServiceId}
          >
            {upsertMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Tab 1: Frameworks
// =============================================================================

function FrameworksTab({
  onFrameworkSelect,
}: {
  onFrameworkSelect: (id: string) => void;
}) {
  const { t } = useTranslation('compliance');
  const { t: tCommon } = useTranslation('common');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RegulatoryFramework | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegulatoryFramework | null>(null);

  const { data, isLoading, isError, refetch } = useFrameworks({ limit: 100 });
  const deleteMutation = useDeleteFramework();

  const { data: licenseInfo } = useLicenseInfo();
  const isEnterprise = licenseInfo?.edition === 'enterprise';
  const frameworks = data?.data ?? [];
  const atCommunityLimit = !isEnterprise && frameworks.length >= COMMUNITY_FRAMEWORK_LIMIT;

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(tCommon('deleted'));
      setDeleteTarget(null);
    } catch {
      toast.error(tCommon('error'));
    }
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm text-red-400">{tCommon('load_error')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {tCommon('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('frameworks.title')}
          </h2>
          {!isLoading && data && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('frameworks.total', { count: data.meta.total })}
            </p>
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  size="sm"
                  disabled={atCommunityLimit}
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('frameworks.create')}
                </Button>
              </span>
            </TooltipTrigger>
            {atCommunityLimit && (
              <TooltipContent>
                <p>{t('frameworks.community_limit_hint')}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="dark:border-slate-700 dark:bg-slate-800/50">
              <TableHead className="dark:text-slate-400">{t('fields.name')}</TableHead>
              <TableHead className="dark:text-slate-400">{t('fields.version')}</TableHead>
              <TableHead className="dark:text-slate-400">{t('fields.effective_date')}</TableHead>
              <TableHead className="dark:text-slate-400">{t('fields.requirements_count')}</TableHead>
              <TableHead className="dark:text-slate-400">{t('fields.created_at')}</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows cols={6} />
            ) : frameworks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    message={t('frameworks.empty')}
                    hint={t('frameworks.empty_hint')}
                  />
                </TableCell>
              </TableRow>
            ) : (
              frameworks.map((fw) => (
                <TableRow
                  key={fw.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 dark:border-slate-700"
                  onClick={() => onFrameworkSelect(fw.id)}
                >
                  <TableCell className="font-medium text-slate-900 dark:text-white">
                    {fw.name}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {fw.version ?? '—'}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">
                    {fw.effective_date
                      ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                          new Date(fw.effective_date),
                        )
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {fw.requirement_count !== undefined ? (
                      <Badge
                        variant="secondary"
                        className="dark:bg-slate-700 dark:text-slate-300"
                      >
                        {fw.requirement_count}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400 text-sm">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                      new Date(fw.created_at),
                    )}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        onClick={() => setEditTarget(fw)}
                      >
                        {tCommon('edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => setDeleteTarget(fw)}
                        disabled={!!fw.requirement_count && fw.requirement_count > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <FrameworkDialog
        open={createOpen || !!editTarget}
        onClose={() => {
          setCreateOpen(false);
          setEditTarget(null);
        }}
        initial={editTarget}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{tCommon('confirm_delete')}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {t('dialogs.delete_confirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Tab 2: Requirements
// =============================================================================

function RequirementsTab({
  frameworks,
  selectedFrameworkId,
  onFrameworkChange,
}: {
  frameworks: RegulatoryFramework[];
  selectedFrameworkId: string | undefined;
  onFrameworkChange: (id: string) => void;
}) {
  const { t } = useTranslation('compliance');
  const { t: tCommon } = useTranslation('common');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RegulatoryRequirement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegulatoryRequirement | null>(null);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useRequirements(selectedFrameworkId, { limit: 200 });
  const deleteMutation = useDeleteRequirement();

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const requirements = useMemo(() => {
    const all = data?.data ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const selectedFramework = frameworks.find((fw) => fw.id === selectedFrameworkId);

  async function handleDelete() {
    if (!deleteTarget || !selectedFrameworkId) return;
    try {
      await deleteMutation.mutateAsync({ rid: deleteTarget.id, frameworkId: selectedFrameworkId });
      toast.success(tCommon('deleted'));
      setDeleteTarget(null);
    } catch {
      toast.error(tCommon('error'));
    }
  }

  return (
    <div className="space-y-4">
      {/* Framework selector + create button */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <FrameworkSelector
            frameworks={frameworks}
            selectedId={selectedFrameworkId}
            onSelect={onFrameworkChange}
            placeholder={t('requirements.select_framework')}
          />
          {selectedFramework && (
            <p className="text-xs text-slate-400">
              {t('requirements.total', { count: data?.meta.total ?? 0 })}
            </p>
          )}
        </div>

        {selectedFrameworkId && (
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('filters.search_placeholder')}
              className="w-56 h-8 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('requirements.create')}
            </Button>
          </div>
        )}
      </div>

      {!selectedFrameworkId ? (
        <EmptyState message={t('requirements.select_framework')} />
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-700 dark:bg-slate-800/50">
                <TableHead className="w-28 dark:text-slate-400">{t('fields.code')}</TableHead>
                <TableHead className="dark:text-slate-400">{t('fields.title')}</TableHead>
                <TableHead className="w-40 dark:text-slate-400">{t('fields.category')}</TableHead>
                <TableHead className="dark:text-slate-400">{t('fields.description')}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <SkeletonRows cols={5} />
              ) : requirements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState
                      message={t('requirements.empty')}
                      hint={t('requirements.empty_hint')}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                requirements.flatMap((req) => {
                  const isExpanded = expandedIds.has(req.id);
                  return [
                    <TableRow
                      key={req.id}
                      className="dark:border-slate-700 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(req.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          }
                          <span className="font-mono text-xs rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                            {req.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        {req.title}
                      </TableCell>
                      <TableCell>
                        {req.category ? (
                          <Badge
                            variant="outline"
                            className="text-xs dark:border-slate-600 dark:text-slate-400"
                          >
                            {req.category}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                        <span className="line-clamp-2">{req.description ?? '—'}</span>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            onClick={() => setEditTarget(req)}
                          >
                            {tCommon('edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => setDeleteTarget(req)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>,
                    ...(isExpanded && req.description
                      ? [
                          <TableRow key={`${req.id}-expanded`} className="dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                            <TableCell colSpan={5} className="px-8 py-3">
                              <div className="space-y-2">
                                {req.category && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('fields.category')}:</span>
                                    <Badge variant="outline" className="text-xs dark:border-slate-600 dark:text-slate-400">
                                      {req.category}
                                    </Badge>
                                  </div>
                                )}
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {req.description}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>,
                        ]
                      : []),
                  ];
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      {selectedFrameworkId && (
        <RequirementDialog
          open={createOpen || !!editTarget}
          onClose={() => {
            setCreateOpen(false);
            setEditTarget(null);
          }}
          frameworkId={selectedFrameworkId}
          initial={editTarget}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm dark:bg-slate-900 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{tCommon('confirm_delete')}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {t('dialogs.delete_confirm')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteMutation.isPending && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Tab 3: Matrix
// =============================================================================

function MatrixTab({
  frameworks,
  selectedFrameworkId,
  onFrameworkChange,
}: {
  frameworks: RegulatoryFramework[];
  selectedFrameworkId: string | undefined;
  onFrameworkChange: (id: string) => void;
}) {
  const { t } = useTranslation('compliance');

  const [coverageTarget, setCoverageTarget] = useState<
    (RegulatoryRequirement & { mappings: RequirementMapping[] }) | null
  >(null);

  const { data: svcData } = useServiceDescriptions({ status: 'published' });
  const serviceDescriptions = useMemo(
    () => (svcData?.data ?? []).map((s) => ({ id: s.id, code: s.code, title: s.title })),
    [svcData],
  );

  const { data: matrixData, isLoading } = useMatrix(selectedFrameworkId);

  const requirements = matrixData?.requirements ?? [];

  const stats = useMemo(() => {
    const full = requirements.filter((r) =>
      r.mappings.some((m) => m.coverage_level === 'full'),
    ).length;
    const partial = requirements.filter(
      (r) =>
        !r.mappings.some((m) => m.coverage_level === 'full') &&
        r.mappings.some((m) => m.coverage_level === 'partial'),
    ).length;
    const none = requirements.filter((r) => r.mappings.length === 0).length;
    const na = requirements.filter((r) =>
      r.mappings.every((m) => m.coverage_level === 'not_applicable'),
    ).length;
    return { full, partial, none, na };
  }, [requirements]);

  function getBestCoverage(
    mappings: RequirementMapping[],
  ): RequirementMapping['coverage_level'] | undefined {
    if (mappings.length === 0) return undefined;
    const priority: RequirementMapping['coverage_level'][] = [
      'full',
      'partial',
      'none',
      'not_applicable',
    ];
    for (const level of priority) {
      if (mappings.some((m) => m.coverage_level === level)) return level;
    }
    return mappings[0]?.coverage_level ?? 'none';
  }

  return (
    <div className="space-y-4">
      {/* Framework selector */}
      <div className="flex items-center gap-3">
        <FrameworkSelector
          frameworks={frameworks}
          selectedId={selectedFrameworkId}
          onSelect={onFrameworkChange}
          placeholder={t('requirements.select_framework')}
        />
      </div>

      {!selectedFrameworkId ? (
        <EmptyState message={t('matrix.empty')} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4 dark:bg-slate-800/60 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('matrix.full_coverage')}
                </span>
              </div>
              <p className="text-2xl font-bold text-green-400">{stats.full}</p>
            </Card>
            <Card className="p-4 dark:bg-slate-800/60 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('matrix.partial_coverage')}
                </span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{stats.partial}</p>
            </Card>
            <Card className="p-4 dark:bg-slate-800/60 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('matrix.no_coverage')}
                </span>
              </div>
              <p className="text-2xl font-bold text-red-400">{stats.none}</p>
            </Card>
            <Card className="p-4 dark:bg-slate-800/60 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('matrix.not_applicable')}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-400">{stats.na}</p>
            </Card>
          </div>

          {/* Requirement cards */}
          {requirements.length === 0 ? (
            <EmptyState
              message={t('requirements.empty')}
              hint={t('requirements.empty_hint')}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {requirements.map((req) => {
                const best = getBestCoverage(req.mappings);
                return (
                  <Card
                    key={req.id}
                    className="p-4 dark:bg-slate-800/60 dark:border-slate-700 transition-colors hover:dark:bg-slate-800"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs rounded bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 shrink-0">
                            {req.code}
                          </span>
                          {req.category && (
                            <Badge
                              variant="outline"
                              className="text-xs dark:border-slate-600 dark:text-slate-400"
                            >
                              {req.category}
                            </Badge>
                          )}
                          <CoverageBadge level={best} />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {req.title}
                        </p>
                        {req.mappings.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {req.mappings.map((mapping) => (
                              <div
                                key={`${mapping.requirement_id}-${mapping.service_desc_id}`}
                                className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                              >
                                <CoverageBadge level={mapping.coverage_level} />
                                {mapping.service_code && (
                                  <span className="font-mono text-blue-400">
                                    {mapping.service_code}
                                  </span>
                                )}
                                {mapping.service_title && (
                                  <span>{mapping.service_title}</span>
                                )}
                                {mapping.evidence_notes && (
                                  <span className="text-slate-400 italic truncate max-w-xs">
                                    — {mapping.evidence_notes}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        onClick={() => setCoverageTarget(req)}
                      >
                        {t('matrix.set_coverage')}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Coverage Dialog */}
      {selectedFrameworkId && (
        <CoverageDialog
          open={!!coverageTarget}
          onClose={() => setCoverageTarget(null)}
          requirement={coverageTarget}
          frameworkId={selectedFrameworkId}
          serviceDescriptions={serviceDescriptions}
        />
      )}
    </div>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export function CompliancePage() {
  const { t } = useTranslation('compliance');

  const [activeTab, setActiveTab] = useState('frameworks');
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | undefined>(undefined);

  const { data: frameworksData } = useFrameworks({ limit: 100 });
  const frameworks = frameworksData?.data ?? [];

  // Auto-select first framework when data loads
  useEffect(() => {
    if (!selectedFrameworkId && frameworks.length > 0) {
      setSelectedFrameworkId(frameworks[0]!.id);
    }
  }, [frameworks, selectedFrameworkId]);

  function handleFrameworkSelect(id: string) {
    setSelectedFrameworkId(id);
    setActiveTab('requirements');
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 dark:bg-blue-500/10">
          <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('matrix.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="dark:bg-slate-800 dark:border-slate-700">
          <TabsTrigger
            value="frameworks"
            className="dark:data-[state=active]:bg-slate-700 dark:text-slate-300 dark:data-[state=active]:text-white"
          >
            {t('frameworks.title')}
          </TabsTrigger>
          <TabsTrigger
            value="requirements"
            className="dark:data-[state=active]:bg-slate-700 dark:text-slate-300 dark:data-[state=active]:text-white"
          >
            {t('requirements.title')}
          </TabsTrigger>
          <TabsTrigger
            value="matrix"
            className="dark:data-[state=active]:bg-slate-700 dark:text-slate-300 dark:data-[state=active]:text-white"
          >
            {t('matrix.title')}
          </TabsTrigger>
          <TabsTrigger
            value="controls"
            className="dark:data-[state=active]:bg-slate-700 dark:text-slate-300 dark:data-[state=active]:text-white"
          >
            {t('controls.title')}
          </TabsTrigger>
          <TabsTrigger
            value="audits"
            className="dark:data-[state=active]:bg-slate-700 dark:text-slate-300 dark:data-[state=active]:text-white"
          >
            {t('audits.title')}
          </TabsTrigger>
          <TabsTrigger
            value="evidence"
            className="dark:data-[state=active]:bg-slate-700 dark:text-slate-300 dark:data-[state=active]:text-white"
          >
            {t('evidence.title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="frameworks" className="space-y-0 mt-0">
          <FrameworksTab onFrameworkSelect={handleFrameworkSelect} />
        </TabsContent>

        <TabsContent value="requirements" className="space-y-0 mt-0">
          <RequirementsTab
            frameworks={frameworks}
            selectedFrameworkId={selectedFrameworkId}
            onFrameworkChange={setSelectedFrameworkId}
          />
        </TabsContent>

        <TabsContent value="matrix" className="space-y-0 mt-0">
          <MatrixTab
            frameworks={frameworks}
            selectedFrameworkId={selectedFrameworkId}
            onFrameworkChange={setSelectedFrameworkId}
          />
        </TabsContent>

        <TabsContent value="controls" className="space-y-0 mt-0">
          <ControlsTab />
        </TabsContent>

        <TabsContent value="audits" className="space-y-0 mt-0">
          <AuditsTab />
        </TabsContent>

        <TabsContent value="evidence" className="space-y-0 mt-0">
          <EvidenceTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
