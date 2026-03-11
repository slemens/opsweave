import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Tags,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useClassificationModels,
  type ClassificationModel,
  type ClassificationValue,
} from '@/api/classifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { classificationKeys } from '@/api/classifications';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// ---------------------------------------------------------------------------
// Mutation hooks (model + value CRUD)
// ---------------------------------------------------------------------------

function useCreateClassificationModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string | null }) =>
      apiClient.post<ClassificationModel>('/classification-models', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: classificationKeys.models() }); },
  });
}

function useUpdateClassificationModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; description?: string | null }) =>
      apiClient.put<ClassificationModel>(`/classification-models/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: classificationKeys.models() }); },
  });
}

function useDeleteClassificationModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/classification-models/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: classificationKeys.models() }); },
  });
}

function useCreateClassificationValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, ...data }: { modelId: string; value: string; label: string; color?: string | null; sort_order?: number }) =>
      apiClient.post<ClassificationValue>(`/classification-models/${modelId}/values`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: classificationKeys.models() }); },
  });
}

function useDeleteClassificationValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ modelId, valueId }: { modelId: string; valueId: string }) =>
      apiClient.delete(`/classification-models/${modelId}/values/${valueId}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: classificationKeys.models() }); },
  });
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ClassificationSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);

  const { data: models, isLoading } = useClassificationModels();
  const modelList = useMemo(() => models ?? [], [models]);

  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  // Model dialog state
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ClassificationModel | null>(null);
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');

  // Value dialog state
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [valueModelId, setValueModelId] = useState('');
  const [valueName, setValueName] = useState('');
  const [valueLabel, setValueLabel] = useState('');
  const [valueColor, setValueColor] = useState('');

  const createModel = useCreateClassificationModel();
  const updateModel = useUpdateClassificationModel();
  const deleteModel = useDeleteClassificationModel();
  const createValue = useCreateClassificationValue();
  const deleteValue = useDeleteClassificationValue();

  function toggleExpand(id: string) {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function resetModelForm() {
    setModelName('');
    setModelDescription('');
    setEditingModel(null);
  }

  function openEditModel(m: ClassificationModel) {
    setEditingModel(m);
    setModelName(m.name);
    setModelDescription(m.description ?? '');
    setModelDialogOpen(true);
  }

  async function handleSaveModel() {
    if (!modelName.trim()) return;
    const payload = { name: modelName.trim(), description: modelDescription.trim() || null };
    try {
      if (editingModel) {
        await updateModel.mutateAsync({ id: editingModel.id, ...payload });
        toast.success(t('settings:classifications.update_success'));
      } else {
        await createModel.mutateAsync(payload);
        toast.success(t('settings:classifications.create_success'));
      }
      setModelDialogOpen(false);
      resetModelForm();
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDeleteModel(id: string) {
    try {
      await deleteModel.mutateAsync(id);
      toast.success(t('settings:classifications.delete_success'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  function openAddValue(modelId: string) {
    setValueModelId(modelId);
    setValueName('');
    setValueLabel('');
    setValueColor('');
    setValueDialogOpen(true);
  }

  async function handleSaveValue() {
    if (!valueName.trim() || !valueLabel.trim()) return;
    try {
      await createValue.mutateAsync({
        modelId: valueModelId,
        value: valueName.trim(),
        label: valueLabel.trim(),
        color: valueColor.trim() || null,
      });
      toast.success(t('settings:classifications.value_create_success'));
      setValueDialogOpen(false);
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDeleteValue(modelId: string, valueId: string) {
    try {
      await deleteValue.mutateAsync({ modelId, valueId });
      toast.success(t('settings:classifications.value_delete_success'));
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="h-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Tags className="h-4 w-4" />
                {t('settings:classifications.title')}
              </CardTitle>
              <CardDescription>{t('settings:classifications.description')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => { resetModelForm(); setModelDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:classifications.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {modelList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Tags className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('settings:classifications.empty')}</p>
              <p className="text-xs">{t('settings:classifications.empty_hint')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {modelList.map((model) => {
                const isOpen = expandedModels.has(model.id);
                return (
                  <Collapsible key={model.id} open={isOpen} onOpenChange={() => toggleExpand(model.id)}>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 text-sm font-medium hover:underline">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {model.name}
                          <Badge variant="outline" className="text-[10px] ml-1">
                            {model.values?.length ?? 0} {t('settings:classifications.values')}
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openAddValue(model.id)}>
                          <Plus className="mr-1 h-3 w-3" />
                          {t('settings:classifications.add_value')}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModel(model)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              {t('common:actions.edit')}
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  {t('common:actions.delete')}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('settings:classifications.delete_confirm')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteModel(model.id)}>
                                    {t('common:actions.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 space-y-1 pb-2">
                        {(model.values ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground py-2 pl-2">
                            {t('settings:classifications.no_values')}
                          </p>
                        ) : (
                          (model.values ?? []).map((val) => (
                            <div key={val.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                              <div className="flex items-center gap-2">
                                {val.color && (
                                  <span
                                    className="inline-block h-3 w-3 rounded-full border"
                                    style={{ backgroundColor: val.color }}
                                  />
                                )}
                                <span className="font-mono text-xs">{val.value}</span>
                                <span className="text-muted-foreground">{val.label}</span>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('settings:classifications.value_delete_confirm')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteValue(model.id, val.id)}>
                                      {t('common:actions.delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Model Dialog */}
      <Dialog open={modelDialogOpen} onOpenChange={(open) => { setModelDialogOpen(open); if (!open) resetModelForm(); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? t('settings:classifications.edit') : t('settings:classifications.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:classifications.name_col')}</Label>
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="CIA+A" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:classifications.description_field')}</Label>
              <Input value={modelDescription} onChange={(e) => setModelDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModelDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSaveModel()}
              disabled={!modelName.trim() || createModel.isPending || updateModel.isPending}
            >
              {createModel.isPending || updateModel.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Value Dialog */}
      <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('settings:classifications.add_value')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:classifications.value_key')}</Label>
              <Input value={valueName} onChange={(e) => setValueName(e.target.value)} placeholder="high" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:classifications.value_label')}</Label>
              <Input value={valueLabel} onChange={(e) => setValueLabel(e.target.value)} placeholder="Hoch" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:classifications.value_color')}</Label>
              <Input value={valueColor} onChange={(e) => setValueColor(e.target.value)} placeholder="#ef4444" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSaveValue()}
              disabled={!valueName.trim() || !valueLabel.trim() || createValue.isPending}
            >
              {createValue.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
