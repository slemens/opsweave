import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface Project {
  id: string;
  name: string;
  code: string;
  description: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectAsset {
  asset_id: string;
  asset_name: string;
  asset_display_name: string;
  asset_type: string;
  role: string | null;
  added_at: string;
}

interface ProjectTicket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
}

// ---------------------------------------------------------------------------
// API Hooks
// ---------------------------------------------------------------------------

const projectKeys = {
  all: ['projects'] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
  assets: (id: string) => [...projectKeys.all, id, 'assets'] as const,
  tickets: (id: string) => [...projectKeys.all, id, 'tickets'] as const,
};

function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiClient.get<Project>(`/projects/${id}`),
    enabled: !!id,
  });
}

function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Project> & { id: string }) =>
      apiClient.put<Project>(`/projects/${id}`, data),
    onSuccess: (_d, vars) => { void qc.invalidateQueries({ queryKey: projectKeys.detail(vars.id) }); },
  });
}

function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/projects/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: projectKeys.all }); },
  });
}

function useProjectAssets(id: string) {
  return useQuery({
    queryKey: projectKeys.assets(id),
    queryFn: () => apiClient.get<ProjectAsset[]>(`/projects/${id}/assets`),
    enabled: !!id,
  });
}

function useAddProjectAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, assetId, role }: { projectId: string; assetId: string; role?: string }) =>
      apiClient.post(`/projects/${projectId}/assets`, { asset_id: assetId, role }),
    onSuccess: (_d, vars) => { void qc.invalidateQueries({ queryKey: projectKeys.assets(vars.projectId) }); },
  });
}

function useRemoveProjectAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, assetId }: { projectId: string; assetId: string }) =>
      apiClient.delete(`/projects/${projectId}/assets/${assetId}`),
    onSuccess: (_d, vars) => { void qc.invalidateQueries({ queryKey: projectKeys.assets(vars.projectId) }); },
  });
}

function useProjectTickets(id: string) {
  return useQuery({
    queryKey: projectKeys.tickets(id),
    queryFn: () => apiClient.get<ProjectTicket[]>(`/projects/${id}/tickets`),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Status colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(['projects', 'common']);
  const navigate = useNavigate();

  const { data: project, isLoading } = useProject(id ?? '');
  const { data: assets } = useProjectAssets(id ?? '');
  const { data: tickets } = useProjectTickets(id ?? '');
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const addAsset = useAddProjectAsset();
  const removeAsset = useRemoveProjectAsset();

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // Add asset dialog
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [assetIdInput, setAssetIdInput] = useState('');

  const assetList = useMemo(() => assets ?? [], [assets]);
  const ticketList = useMemo(() => tickets ?? [], [tickets]);

  function openEdit() {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? '');
    setEditStatus(project.status);
    setEditOpen(true);
  }

  async function handleSave() {
    if (!id || !editName.trim()) return;
    try {
      await updateProject.mutateAsync({
        id,
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
      });
      toast.success(t('projects:update_success'));
      setEditOpen(false);
    } catch {
      toast.error(t('projects:update_error'));
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteProject.mutateAsync(id);
      toast.success(t('projects:delete_success'));
      navigate('/projects');
    } catch {
      toast.error(t('projects:delete_error'));
    }
  }

  async function handleAddAsset() {
    if (!id || !assetIdInput.trim()) return;
    try {
      await addAsset.mutateAsync({ projectId: id, assetId: assetIdInput.trim() });
      toast.success(t('projects:asset_added'));
      setAddAssetOpen(false);
      setAssetIdInput('');
    } catch {
      toast.error(t('projects:asset_add_error'));
    }
  }

  async function handleRemoveAsset(assetId: string) {
    if (!id) return;
    try {
      await removeAsset.mutateAsync({ projectId: id, assetId });
      toast.success(t('projects:asset_removed'));
    } catch {
      toast.error(t('projects:asset_remove_error'));
    }
  }

  if (isLoading || !project) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="page-project-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} data-testid="btn-back-projects" aria-label={t('common:actions.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              <Badge className="font-mono text-xs" variant="outline">{project.code}</Badge>
              <Badge className={`text-[10px] ${STATUS_COLORS[project.status] ?? ''}`}>
                {t(`projects:statuses.${project.status}`)}
              </Badge>
            </div>
            {project.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit} data-testid="btn-edit-project">
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {t('common:actions.edit')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive" data-testid="btn-delete-project">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t('common:actions.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('common:actions.delete')}</AlertDialogTitle>
                <AlertDialogDescription>{t('projects:delete_confirm')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleDelete()}>
                  {t('common:actions.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t('projects:customer')}</p>
            <p className="text-sm font-medium mt-1">{project.customer_name ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t('projects:start_date')}</p>
            <p className="text-sm font-medium mt-1">{project.start_date ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t('projects:end_date')}</p>
            <p className="text-sm font-medium mt-1">{project.end_date ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t('projects:assets_count')}</p>
            <p className="text-sm font-medium mt-1">{assetList.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets" data-testid="tab-project-assets">{t('projects:tabs.assets')}</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-project-tickets">{t('projects:tabs.tickets')}</TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('projects:tabs.assets')}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setAddAssetOpen(true)} data-testid="btn-add-asset">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t('projects:add_asset')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assetList.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">{t('projects:no_assets')}</p>
              ) : (
                <div className="rounded-md border">
                  <Table data-testid="table-project-assets">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('projects:asset_name')}</TableHead>
                        <TableHead>{t('projects:asset_type')}</TableHead>
                        <TableHead>{t('projects:asset_role')}</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetList.map((a) => (
                        <TableRow key={a.asset_id}>
                          <TableCell className="font-medium">
                            {a.asset_display_name || a.asset_name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{a.asset_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{a.role ?? '—'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => void handleRemoveAsset(a.asset_id)}
                              aria-label={t('common:actions.remove')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tickets Tab */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('projects:tabs.tickets')}</CardTitle>
            </CardHeader>
            <CardContent>
              {ticketList.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">{t('projects:no_tickets')}</p>
              ) : (
                <div className="rounded-md border">
                  <Table data-testid="table-project-tickets">
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('projects:ticket_number')}</TableHead>
                        <TableHead>{t('projects:ticket_title')}</TableHead>
                        <TableHead>{t('projects:ticket_status')}</TableHead>
                        <TableHead>{t('projects:ticket_priority')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ticketList.map((tk) => (
                        <TableRow
                          key={tk.id}
                          className="cursor-pointer"
                          onClick={() => navigate(`/tickets/${tk.id}`)}
                        >
                          <TableCell className="font-mono text-xs">{tk.ticket_number}</TableCell>
                          <TableCell className="font-medium">{tk.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{tk.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{tk.priority}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[450px]" data-testid="modal-edit-project">
          <DialogHeader>
            <DialogTitle>{t('projects:edit')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('projects:name_col')}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t('projects:description_field')}</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>{t('projects:status_col')}</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['planning', 'active', 'on_hold', 'completed'].map((s) => (
                    <SelectItem key={s} value={s}>{t(`projects:statuses.${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={!editName.trim() || updateProject.isPending}>
              {updateProject.isPending ? t('common:status.loading') : t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={addAssetOpen} onOpenChange={setAddAssetOpen}>
        <DialogContent className="sm:max-w-[400px]" data-testid="modal-add-asset">
          <DialogHeader>
            <DialogTitle>{t('projects:add_asset')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('projects:asset_id')}</Label>
              <Input
                value={assetIdInput}
                onChange={(e) => setAssetIdInput(e.target.value)}
                placeholder="Asset UUID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddAssetOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={() => void handleAddAsset()} disabled={!assetIdInput.trim() || addAsset.isPending}>
              {addAsset.isPending ? t('common:status.loading') : t('common:actions.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
