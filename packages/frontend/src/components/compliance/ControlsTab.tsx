import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// ---------------------------------------------------------------------------
// Types & API
// ---------------------------------------------------------------------------

interface ComplianceControl {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: string | null;
  control_type: string;
  status: string;
  owner_id: string | null;
  created_at: string;
}

const controlKeys = {
  all: ['compliance-controls'] as const,
  list: () => [...controlKeys.all, 'list'] as const,
};

function useControls() {
  return useQuery({
    queryKey: controlKeys.list(),
    queryFn: () => apiClient.get<ComplianceControl[]>('/compliance/controls'),
  });
}

function useCreateControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ComplianceControl>) =>
      apiClient.post<ComplianceControl>('/compliance/controls', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: controlKeys.all }); },
  });
}

function useUpdateControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ComplianceControl> & { id: string }) =>
      apiClient.put<ComplianceControl>(`/compliance/controls/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: controlKeys.all }); },
  });
}

function useDeleteControl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/compliance/controls/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: controlKeys.all }); },
  });
}

const CONTROL_TYPES = ['preventive', 'detective', 'corrective'] as const;
const CONTROL_STATUSES = ['planned', 'implemented', 'verified', 'not_applicable'] as const;

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  implemented: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  not_applicable: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ControlsTab() {
  const { t } = useTranslation(['compliance', 'common']);

  const { data: controls, isLoading } = useControls();
  const createControl = useCreateControl();
  const updateControl = useUpdateControl();
  const deleteControl = useDeleteControl();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceControl | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [controlType, setControlType] = useState<string>('preventive');
  const [status, setStatus] = useState<string>('planned');

  const controlList = useMemo(() => {
    const raw = controls as unknown;
    return Array.isArray(raw) ? raw : (raw as { data?: ComplianceControl[] })?.data ?? [];
  }, [controls]);

  function resetForm() {
    setCode('');
    setTitle('');
    setDescription('');
    setCategory('');
    setControlType('preventive');
    setStatus('planned');
    setEditing(null);
  }

  function openEdit(c: ComplianceControl) {
    setEditing(c);
    setCode(c.code);
    setTitle(c.title);
    setDescription(c.description ?? '');
    setCategory(c.category ?? '');
    setControlType(c.control_type);
    setStatus(c.status);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!code.trim() || !title.trim()) return;
    const payload = {
      code: code.trim(),
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      control_type: controlType,
      status,
    };
    try {
      if (editing) {
        await updateControl.mutateAsync({ id: editing.id, ...payload });
        toast.success(t('compliance:controls.update_success'));
      } else {
        await createControl.mutateAsync(payload);
        toast.success(t('compliance:controls.create_success'));
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(t('compliance:controls.save_error'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteControl.mutateAsync(id);
      toast.success(t('compliance:controls.delete_success'));
    } catch {
      toast.error(t('compliance:controls.save_error'));
    }
  }

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded bg-muted" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {t('compliance:controls.title')}
            </CardTitle>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('compliance:controls.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {controlList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('compliance:controls.empty')}</p>
              <p className="text-xs">{t('compliance:controls.empty_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('compliance:controls.code')}</TableHead>
                    <TableHead>{t('compliance:controls.title_col')}</TableHead>
                    <TableHead>{t('compliance:controls.type')}</TableHead>
                    <TableHead>{t('compliance:controls.status_col')}</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controlList.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(c)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(c); } }} role="button" tabIndex={0}>
                      <TableCell className="font-mono text-xs font-medium">{c.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{c.title}</div>
                        {c.category && (
                          <span className="text-xs text-muted-foreground">{c.category}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {t(`compliance:controls.types.${c.control_type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_COLORS[c.status] ?? ''}`}>
                          {t(`compliance:controls.statuses.${c.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('common:actions.menu')}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
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
                                  <AlertDialogDescription>{t('compliance:controls.delete_confirm')}</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(c.id)}>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('compliance:controls.edit') : t('compliance:controls.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('compliance:controls.code')}</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CTRL-001" disabled={!!editing} />
              </div>
              <div className="grid gap-2">
                <Label>{t('compliance:controls.category')}</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Access Control" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('compliance:controls.title_col')}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t('compliance:controls.description')}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('compliance:controls.type')}</Label>
                <Select value={controlType} onValueChange={setControlType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTROL_TYPES.map((ct) => (
                      <SelectItem key={ct} value={ct}>{t(`compliance:controls.types.${ct}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('compliance:controls.status_col')}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTROL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`compliance:controls.statuses.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!code.trim() || !title.trim() || createControl.isPending || updateControl.isPending}
            >
              {createControl.isPending || updateControl.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
