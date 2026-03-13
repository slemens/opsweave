import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  GitCompareArrows,
  Download,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import {
  useCrossMappings,
  useCreateCrossMapping,
  useDeleteCrossMapping,
  useFrameworks,
  useRequirements,
  complianceKeys,
  exportCrossMappingsCsv,
  importCrossMappingsCsv,
} from '@/api/compliance';
import type { CrossMapping } from '@/api/compliance';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAPPING_TYPES = ['equal', 'partial', 'related'] as const;

const MAPPING_TYPE_COLORS: Record<string, string> = {
  equal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  related: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CrossMappingsTab() {
  const { t } = useTranslation(['compliance', 'common']);

  const { data: mappingsRaw, isLoading } = useCrossMappings();
  const createMapping = useCreateCrossMapping();
  const deleteMapping = useDeleteCrossMapping();
  const { data: frameworksData } = useFrameworks({ limit: 100 });

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceFrameworkId, setSourceFrameworkId] = useState('');
  const [sourceRequirementId, setSourceRequirementId] = useState('');
  const [targetFrameworkId, setTargetFrameworkId] = useState('');
  const [targetRequirementId, setTargetRequirementId] = useState('');
  const [mappingType, setMappingType] = useState<string>('related');
  const [notes, setNotes] = useState('');

  const mappingList = useMemo(() => {
    const raw = mappingsRaw as unknown;
    return Array.isArray(raw) ? raw as CrossMapping[] : (raw as { data?: CrossMapping[] })?.data ?? [];
  }, [mappingsRaw]);

  const frameworks = useMemo(() => {
    if (!frameworksData) return [];
    const raw = frameworksData as unknown;
    if (Array.isArray(raw)) return raw;
    return (raw as { data?: Array<{ id: string; name: string; version: string | null }> })?.data ?? [];
  }, [frameworksData]);

  const { data: sourceReqsRaw } = useRequirements(sourceFrameworkId || undefined, { limit: 500 });
  const { data: targetReqsRaw } = useRequirements(targetFrameworkId || undefined, { limit: 500 });

  const sourceRequirements = useMemo(() => {
    if (!sourceReqsRaw) return [];
    const raw = sourceReqsRaw as unknown;
    if (Array.isArray(raw)) return raw;
    return (raw as { data?: Array<{ id: string; code: string; title: string }> })?.data ?? [];
  }, [sourceReqsRaw]);

  const targetRequirements = useMemo(() => {
    if (!targetReqsRaw) return [];
    const raw = targetReqsRaw as unknown;
    if (Array.isArray(raw)) return raw;
    return (raw as { data?: Array<{ id: string; code: string; title: string }> })?.data ?? [];
  }, [targetReqsRaw]);

  function resetForm() {
    setSourceFrameworkId('');
    setSourceRequirementId('');
    setTargetFrameworkId('');
    setTargetRequirementId('');
    setMappingType('related');
    setNotes('');
  }

  async function handleSave() {
    if (!sourceRequirementId || !targetRequirementId || !mappingType) return;
    if (sourceFrameworkId === targetFrameworkId) {
      toast.error(t('compliance:cross_mappings.different_framework_required'));
      return;
    }
    try {
      await createMapping.mutateAsync({
        source_requirement_id: sourceRequirementId,
        target_requirement_id: targetRequirementId,
        mapping_type: mappingType as 'equal' | 'partial' | 'related',
        notes: notes.trim() || null,
      });
      toast.success(t('compliance:cross_mappings.create_success'));
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(t('compliance:cross_mappings.save_error'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMapping.mutateAsync(id);
      toast.success(t('compliance:cross_mappings.delete_success'));
    } catch {
      toast.error(t('compliance:cross_mappings.save_error'));
    }
  }

  async function handleExport() {
    try {
      const csv = await exportCrossMappingsCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cross-mappings-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('compliance:cross_mappings.save_error'));
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const csvText = await file.text();
      const result = await importCrossMappingsCsv(csvText);
      const parts: string[] = [];
      if (result.imported > 0) parts.push(t('compliance:cross_mappings.import_success', { count: result.imported }));
      if (result.skipped > 0) parts.push(t('compliance:cross_mappings.import_skipped', { count: result.skipped }));
      if (result.errors.length > 0) parts.push(t('compliance:cross_mappings.import_errors', { count: result.errors.length }));
      toast[result.errors.length > 0 ? 'warning' : 'success'](parts.join(' | '));
      void queryClient.invalidateQueries({ queryKey: complianceKeys.crossMappings() });
    } catch {
      toast.error(t('compliance:cross_mappings.save_error'));
    } finally {
      setImporting(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded bg-muted" />;
  }

  return (
    <div className="space-y-4" data-testid="cross-mappings-tab">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4" />
              {t('compliance:cross_mappings.title')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void handleExport()} data-testid="export-cross-mappings">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {t('compliance:cross_mappings.export_csv')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="import-cross-mappings">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {t('compliance:cross_mappings.import_csv')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => void handleImportFile(e)}
              />
              <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="create-cross-mapping">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {t('compliance:cross_mappings.create')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mappingList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="cross-mappings-empty">
              <GitCompareArrows className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('compliance:cross_mappings.no_mappings')}</p>
              <p className="text-xs">{t('compliance:cross_mappings.no_mappings_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('compliance:cross_mappings.source_requirement')}</TableHead>
                    <TableHead>{t('compliance:cross_mappings.target_requirement')}</TableHead>
                    <TableHead>{t('compliance:cross_mappings.mapping_type')}</TableHead>
                    <TableHead>{t('compliance:cross_mappings.notes')}</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappingList.map((m) => (
                    <TableRow key={m.id} data-testid={`cross-mapping-row-${m.id}`}>
                      <TableCell>
                        <div className="font-medium text-sm">
                          <span className="font-mono text-xs">{m.source_requirement?.code}</span>
                          {m.source_requirement?.framework_name && (
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({m.source_requirement.framework_name})
                            </span>
                          )}
                        </div>
                        {m.source_requirement?.title && (
                          <span className="text-xs text-muted-foreground">{m.source_requirement.title}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">
                          <span className="font-mono text-xs">{m.target_requirement?.code}</span>
                          {m.target_requirement?.framework_name && (
                            <span className="text-muted-foreground ml-1 text-xs">
                              ({m.target_requirement.framework_name})
                            </span>
                          )}
                        </div>
                        {m.target_requirement?.title && (
                          <span className="text-xs text-muted-foreground">{m.target_requirement.title}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${MAPPING_TYPE_COLORS[m.mapping_type] ?? ''}`}>
                          {t(`compliance:cross_mappings.types.${m.mapping_type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {m.notes || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" data-testid={`delete-cross-mapping-${m.id}`} aria-label={t('common:actions.delete')}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('compliance:cross_mappings.delete_confirm')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(m.id)}>
                                {t('common:actions.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{t('compliance:cross_mappings.create')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Source */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('compliance:cross_mappings.source_framework')}</Label>
                <Select value={sourceFrameworkId} onValueChange={(v) => { setSourceFrameworkId(v); setSourceRequirementId(''); }}>
                  <SelectTrigger data-testid="select-source-framework"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {frameworks.map((fw) => (
                      <SelectItem key={fw.id} value={fw.id}>
                        {fw.name} {fw.version ? `(${fw.version})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('compliance:cross_mappings.source_requirement')}</Label>
                <Select value={sourceRequirementId} onValueChange={setSourceRequirementId} disabled={!sourceFrameworkId}>
                  <SelectTrigger data-testid="select-source-requirement"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sourceRequirements.map((req) => (
                      <SelectItem key={req.id} value={req.id}>
                        {req.code} - {req.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('compliance:cross_mappings.target_framework')}</Label>
                <Select value={targetFrameworkId} onValueChange={(v) => { setTargetFrameworkId(v); setTargetRequirementId(''); }}>
                  <SelectTrigger data-testid="select-target-framework"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {frameworks
                      .filter((fw) => fw.id !== sourceFrameworkId)
                      .map((fw) => (
                        <SelectItem key={fw.id} value={fw.id}>
                          {fw.name} {fw.version ? `(${fw.version})` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('compliance:cross_mappings.target_requirement')}</Label>
                <Select value={targetRequirementId} onValueChange={setTargetRequirementId} disabled={!targetFrameworkId}>
                  <SelectTrigger data-testid="select-target-requirement"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {targetRequirements.map((req) => (
                      <SelectItem key={req.id} value={req.id}>
                        {req.code} - {req.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mapping Type */}
            <div className="grid gap-2">
              <Label>{t('compliance:cross_mappings.mapping_type')}</Label>
              <Select value={mappingType} onValueChange={setMappingType}>
                <SelectTrigger data-testid="select-mapping-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAPPING_TYPES.map((mt) => (
                    <SelectItem key={mt} value={mt}>
                      {t(`compliance:cross_mappings.types.${mt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{t('compliance:cross_mappings.notes')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                data-testid="cross-mapping-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={
                !sourceRequirementId ||
                !targetRequirementId ||
                !mappingType ||
                sourceFrameworkId === targetFrameworkId ||
                createMapping.isPending
              }
              data-testid="save-cross-mapping"
            >
              {createMapping.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
