import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  FolderKanban,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useCustomers } from '@/api/customers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
}

// ---------------------------------------------------------------------------
// API Hooks
// ---------------------------------------------------------------------------

const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, id] as const,
};

function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => apiClient.get<Project[]>('/projects'),
  });
}

function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Project>) =>
      apiClient.post<Project>('/projects', data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: projectKeys.all }); },
  });
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export default function ProjectsPage() {
  const { t } = useTranslation(['projects', 'common']);
  const navigate = useNavigate();

  const { data: projects, isLoading } = useProjects();
  const { data: customersData } = useCustomers();
  const createProject = useCreateProject();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('__none__');
  const [status, setStatus] = useState('planning');

  const customerList = useMemo(() => customersData?.data ?? [], [customersData]);
  const projectList = useMemo(() => {
    const list = projects ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [projects, search]);

  function resetForm() {
    setName('');
    setCode('');
    setDescription('');
    setCustomerId('__none__');
    setStatus('planning');
  }

  async function handleCreate() {
    if (!name.trim() || !code.trim()) return;
    try {
      const created = await createProject.mutateAsync({
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || null,
        customer_id: customerId !== '__none__' ? customerId : null,
        status,
      });
      toast.success(t('projects:create_success'));
      setDialogOpen(false);
      resetForm();
      navigate(`/projects/${created.id}`);
    } catch {
      toast.error(t('projects:create_error'));
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('projects:title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('projects:description')}</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('projects:create')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('projects:search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {projectList.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderKanban className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">{t('projects:empty')}</p>
              <p className="text-xs mt-1">{t('projects:empty_hint')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('projects:code')}</TableHead>
                    <TableHead>{t('projects:name_col')}</TableHead>
                    <TableHead>{t('projects:customer')}</TableHead>
                    <TableHead>{t('projects:status_col')}</TableHead>
                    <TableHead>{t('projects:dates')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectList.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/projects/${p.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-medium">{p.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.customer_name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${STATUS_COLORS[p.status] ?? ''}`}>
                          {t(`projects:statuses.${p.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.start_date ?? '—'} — {p.end_date ?? '—'}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('projects:create')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('projects:name_col')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cloud Migration" />
              </div>
              <div className="grid gap-2">
                <Label>{t('projects:code')}</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  placeholder="PRJ-001"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('projects:description_field')}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('projects:customer')}</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{'\u2014'}</SelectItem>
                    {customerList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('projects:status_col')}</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['planning', 'active', 'on_hold', 'completed'].map((s) => (
                      <SelectItem key={s} value={s}>{t(`projects:statuses.${s}`)}</SelectItem>
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
              onClick={() => void handleCreate()}
              disabled={!name.trim() || !code.trim() || createProject.isPending}
            >
              {createProject.isPending ? t('common:status.loading') : t('common:actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
