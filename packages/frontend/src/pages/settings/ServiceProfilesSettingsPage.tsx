import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
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
import { Textarea } from '@/components/ui/textarea';
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
// Types
// ---------------------------------------------------------------------------

interface ServiceProfile {
  id: string;
  name: string;
  description: string | null;
  dimensions: string | null;
  sla_definition_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// API Hooks
// ---------------------------------------------------------------------------

const profileKeys = {
  all: ['service-profiles'] as const,
  list: () => [...profileKeys.all, 'list'] as const,
};

function useServiceProfiles() {
  return useQuery({
    queryKey: profileKeys.list(),
    queryFn: () => apiClient.get<ServiceProfile[]>('/service-profiles'),
  });
}

function useCreateServiceProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ServiceProfile>) =>
      apiClient.post<ServiceProfile>('/service-profiles', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: profileKeys.all }); },
  });
}

function useUpdateServiceProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ServiceProfile> & { id: string }) =>
      apiClient.put<ServiceProfile>(`/service-profiles/${id}`, data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: profileKeys.all }); },
  });
}

function useDeleteServiceProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/service-profiles/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: profileKeys.all }); },
  });
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ServiceProfilesSettingsPage() {
  const { t } = useTranslation(['settings', 'common']);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceProfile | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dimensions, setDimensions] = useState('');

  const { data: profiles, isLoading } = useServiceProfiles();
  const createProfile = useCreateServiceProfile();
  const updateProfile = useUpdateServiceProfile();
  const deleteProfile = useDeleteServiceProfile();

  const profileList = useMemo(() => profiles ?? [], [profiles]);

  function resetForm() {
    setName('');
    setDescription('');
    setDimensions('');
    setEditing(null);
  }

  function openEdit(sp: ServiceProfile) {
    setEditing(sp);
    setName(sp.name);
    setDescription(sp.description ?? '');
    setDimensions(sp.dimensions ?? '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      dimensions: dimensions.trim() || null,
    };
    try {
      if (editing) {
        await updateProfile.mutateAsync({ id: editing.id, ...payload });
        toast.success(t('settings:service_profiles.update_success'));
      } else {
        await createProfile.mutateAsync(payload);
        toast.success(t('settings:service_profiles.create_success'));
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error(t('settings:save_error'));
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteProfile.mutateAsync(id);
      toast.success(t('settings:service_profiles.delete_success'));
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
                <Layers className="h-4 w-4" />
                {t('settings:service_profiles.title')}
              </CardTitle>
              <CardDescription>{t('settings:service_profiles.description')}</CardDescription>
            </div>
            <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('settings:service_profiles.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {profileList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('settings:service_profiles.empty')}</p>
              <p className="text-xs">{t('settings:service_profiles.empty_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('settings:service_profiles.name_col')}</TableHead>
                    <TableHead>{t('settings:service_profiles.status')}</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profileList.map((sp) => (
                    <TableRow key={sp.id}>
                      <TableCell>
                        <div className="font-medium">{sp.name}</div>
                        {sp.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{sp.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sp.is_active ? 'default' : 'outline'} className="text-[10px]">
                          {sp.is_active ? t('common:status.active') : t('common:status.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(sp)}>
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
                                    {t('settings:service_profiles.delete_confirm')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(sp.id)}>
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
              {editing ? t('settings:service_profiles.edit') : t('settings:service_profiles.create')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('settings:service_profiles.name_col')}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Standard Support" />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:service_profiles.description_field')}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t('settings:service_profiles.dimensions_field')}</Label>
              <Textarea
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder='{"support_hours": "24/7", "response_time": "1h"}'
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{t('settings:service_profiles.dimensions_hint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={!name.trim() || createProfile.isPending || updateProfile.isPending}
            >
              {createProfile.isPending || updateProfile.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
