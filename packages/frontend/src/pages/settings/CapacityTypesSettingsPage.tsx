import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCapacityTypes,
  type CapacityType,
} from '@/api/capacity';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { capacityKeys } from '@/api/capacity';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

function useCreateCapacityType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { slug: string; name: string; unit: string; category?: string }) =>
      apiClient.post<CapacityType>('/capacity/types', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: capacityKeys.types() }); },
  });
}

function useUpdateCapacityType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; unit?: string; category?: string }) =>
      apiClient.put<CapacityType>(`/capacity/types/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: capacityKeys.types() }); },
  });
}

function useDeleteCapacityType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/capacity/types/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: capacityKeys.types() }); },
  });
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CapacityTypesSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CapacityType | null>(null);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');

  const { data: capacityTypes, isLoading } = useCapacityTypes();
  const createType = useCreateCapacityType();
  const updateType = useUpdateCapacityType();
  const deleteType = useDeleteCapacityType();

  const typeList = useMemo(() => capacityTypes ?? [], [capacityTypes]);

  function resetForm() {
    setSlug('');
    setName('');
    setUnit('');
    setCategory('');
    setEditing(null);
  }

  function openEdit(ct: CapacityType) {
    setEditing(ct);
    setSlug((ct as CapacityType & { slug?: string }).slug ?? '');
    setName(ct.name);
    setUnit(ct.unit);
    setCategory((ct as CapacityType & { category?: string }).category ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    const payload = {
      slug: slug.trim(),
      name: name.trim(),
      unit: unit.trim(),
      category: category.trim() || undefined,
    };
    try {
      if (editing) {
        await updateType.mutateAsync({ id: editing.id, name: payload.name, unit: payload.unit, category: payload.category });
        toast.success(t('settings:capacity_types.update_success'));
      } else {
        await createType.mutateAsync(payload);
        toast.success(t('settings:capacity_types.create_success'));
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteType.mutateAsync(id);
      toast.success(t('settings:capacity_types.delete_success'));
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
    <div className="space-y-6" data-testid="page-capacity-types-settings">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                {t('settings:capacity_types.title')}
              </CardTitle>
              <CardDescription>{t('settings:capacity_types.description')}</CardDescription>
            </div>
            <Button size="sm" data-testid="btn-create-capacity-type" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:capacity_types.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {typeList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gauge className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('settings:capacity_types.empty')}</p>
              <p className="text-xs">{t('settings:capacity_types.empty_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table data-testid="table-capacity-types">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:capacity_types.name_col')}</TableHead>
                    <TableHead>{t('settings:capacity_types.unit_col')}</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeList.map((ct) => (
                    <TableRow key={ct.id}>
                      <TableCell className="font-medium">{ct.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">{ct.unit}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('common:actions.menu')}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(ct)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              {t('common:actions.edit')}
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  {t('common:actions.delete')}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('settings:capacity_types.delete_confirm')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(ct.id)}>
                                    {t('common:actions.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[450px]" data-testid="modal-capacity-type">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('settings:capacity_types.edit') : t('settings:capacity_types.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!editing && (
              <div className="grid gap-2">
                <Label>{t('settings:capacity_types.slug_field')}</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="custom_metric"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>{t('settings:capacity_types.name_col')}</Label>
              <Input data-testid="input-capacity-type-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Custom Metric" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:capacity_types.unit_col')}</Label>
              <Input data-testid="input-capacity-type-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="GB" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:capacity_types.category_field')}</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="compute" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              data-testid="btn-save-capacity-type"
              onClick={() => void handleSave()}
              disabled={!name.trim() || createType.isPending || updateType.isPending}
            >
              {createType.isPending || updateType.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
