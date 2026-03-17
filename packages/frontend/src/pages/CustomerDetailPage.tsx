import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  Mail,
  Server,
  Ticket,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  Users,
  ExternalLink,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  UserPlus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from '@/components/ui/alert-dialog';
import { useCustomerOverview, useUpdateCustomer, useDeleteCustomer } from '@/api/customers';
import { usePortalUsers, useCreatePortalUser, useUpdatePortalUser } from '@/api/auth';
import type { PortalUser } from '@/api/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  waiting: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const slaTierColors: Record<string, string> = {
  platinum: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  gold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  silver: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  bronze: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  none: 'bg-gray-100 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400',
};

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'tickets', 'cmdb', 'catalog']);

  const { data: overview, isLoading, isError, refetch } = useCustomerOverview(id);
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIndustry, setEditIndustry] = useState('');

  function openEditDialog() {
    if (!overview) return;
    setEditName(overview.customer.name);
    setEditEmail(overview.customer.contact_email ?? '');
    setEditIndustry(overview.customer.industry ?? '');
    setEditOpen(true);
  }

  function handleEdit() {
    if (!id || !editName.trim()) return;
    updateMutation.mutate(
      {
        id,
        name: editName.trim(),
        contact_email: editEmail.trim() || null,
        industry: editIndustry.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(t('common:customer_detail.edit_success'));
          setEditOpen(false);
        },
      },
    );
  }

  function handleDelete() {
    if (!id) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success(t('common:customer_detail.delete_success'));
        navigate('/customers');
      },
      onError: (err) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) {
          toast.error(t('common:customer_detail.delete_conflict'));
        }
        setDeleteOpen(false);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{t('common:status.error')}</p>
        <p className="text-sm text-muted-foreground mb-4">{t('common:customer_detail.load_error')}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common:actions.back')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common:actions.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const { customer, stats, assets, recent_tickets, sla_assignments, vertical_catalogs } = overview;

  return (
    <div className="space-y-6" data-testid="page-customer-detail">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')} data-testid="btn-back" aria-label={t('common:actions.back')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
            <Badge variant={customer.is_active ? 'default' : 'secondary'}>
              {customer.is_active ? t('common:customer_detail.active') : t('common:customer_detail.inactive')}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            {customer.industry && <span>{customer.industry}</span>}
            {customer.contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {customer.contact_email}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEditDialog} data-testid="btn-edit-customer">
            <Pencil className="mr-2 h-4 w-4" />
            {t('common:customer_detail.edit')}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} disabled={!customer.is_active} data-testid="btn-delete-customer">
            <Trash2 className="mr-2 h-4 w-4" />
            {t('common:customer_detail.delete')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<Server className="h-4 w-4" />}
          label={t('cmdb:title')}
          value={stats.total_assets}
          onClick={() => document.getElementById('section-assets')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <KpiCard
          icon={<Ticket className="h-4 w-4" />}
          label={t('common:nav.tickets')}
          value={stats.total_tickets}
          sub={`${stats.open_tickets} ${t('common:customer_detail.open')}`}
          onClick={() => document.getElementById('section-tickets')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label={t('common:customer_detail.sla_breaches')}
          value={stats.sla_breached_tickets}
          variant={stats.sla_breached_tickets > 0 ? 'destructive' : 'default'}
          onClick={() => document.getElementById('section-sla')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label={t('common:customer_detail.portal_users')}
          value={stats.portal_users}
          onClick={() => document.getElementById('section-portal-users')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <KpiCard
          icon={<BookOpen className="h-4 w-4" />}
          label={t('catalog:vertical.title')}
          value={vertical_catalogs.length}
          onClick={() => document.getElementById('section-catalogs')?.scrollIntoView({ behavior: 'smooth' })}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SLA Assignments */}
        <Card id="section-sla">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {t('common:customer_detail.sla_agreements')}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            {sla_assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t('common:customer_detail.no_sla')}</p>
            ) : (
              <div className="space-y-2">
                {sla_assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 cursor-pointer transition-colors hover:bg-muted/70"
                    onClick={() => navigate('/settings/sla')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{assignment.definition.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {assignment.definition.business_hours}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {assignment.scope === 'customer' && t('common:customer_detail.scope_customer')}
                        {assignment.scope === 'customer_service' && `${t('common:customer_detail.scope_service')}: ${assignment.scope_label}`}
                        {assignment.scope === 'asset' && `${t('common:customer_detail.scope_asset')}: ${assignment.scope_label}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('common:customer_detail.response_time')}: {formatMinutes(assignment.definition.response_time_minutes)}
                        {' / '}
                        {t('common:customer_detail.resolution_time')}: {formatMinutes(assignment.definition.resolution_time_minutes)}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vertical Catalogs */}
        <Card id="section-catalogs">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {t('catalog:vertical.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            {vertical_catalogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t('common:customer_detail.no_vertical_catalogs')}</p>
            ) : (
              <div className="space-y-2">
                {vertical_catalogs.map((vc) => (
                  <div
                    key={vc.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 cursor-pointer transition-colors hover:bg-muted/70"
                    onClick={() => navigate('/services?tab=vertical')}
                  >
                    <div>
                      <p className="text-sm font-medium">{vc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('catalog:fields.base_catalog')}: {vc.base_catalog_name}
                        {vc.override_count > 0 && ` — ${vc.override_count} Overrides`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={vc.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {vc.status}
                      </Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assets */}
      <Card id="section-assets">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4" />
              {t('cmdb:title')} ({stats.total_assets})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-0 pb-4">
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('common:customer_detail.no_assets')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('cmdb:fields.name')}</TableHead>
                  <TableHead className="text-xs">{t('cmdb:fields.type')}</TableHead>
                  <TableHead className="text-xs">{t('cmdb:fields.status')}</TableHead>
                  <TableHead className="text-xs">{t('cmdb:fields.sla_tier')}</TableHead>
                  <TableHead className="text-xs w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/assets/${asset.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/assets/${asset.id}`); } }} role="button" tabIndex={0}>
                    <TableCell className="text-sm font-medium">{asset.display_name}</TableCell>
                    <TableCell className="text-xs">{t(`cmdb:types.${asset.asset_type}`)}</TableCell>
                    <TableCell>
                      <Badge variant={asset.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {t(`cmdb:statuses.${asset.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${slaTierColors[asset.sla_tier] ?? ''}`}>
                        {t(`cmdb:sla_tiers.${asset.sla_tier}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card id="section-tickets">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              {t('common:dashboard.recent_tickets')} ({stats.total_tickets})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-0 pb-4">
          {recent_tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('common:customer_detail.no_tickets')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">{t('tickets:fields.title')}</TableHead>
                  <TableHead className="text-xs">{t('tickets:fields.status')}</TableHead>
                  <TableHead className="text-xs">{t('tickets:fields.priority')}</TableHead>
                  <TableHead className="text-xs">SLA</TableHead>
                  <TableHead className="text-xs">{t('common:fields.created_at')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent_tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/tickets/${ticket.id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/tickets/${ticket.id}`); } }} role="button" tabIndex={0}>
                    <TableCell className="text-xs font-mono">{ticket.ticket_number}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{ticket.title}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status] ?? ''}`}>
                        {t(`tickets:statuses.${ticket.status}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[ticket.priority] ?? ''}`}>
                        {t(`tickets:priorities.${ticket.priority}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {ticket.sla_breached ? (
                        <Badge variant="destructive" className="text-xs">Breach</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">OK</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PortalUsersSection customerId={id!} />

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent data-testid="modal-edit-customer">
          <DialogHeader>
            <DialogTitle>{t('common:customer_detail.edit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('common:customers.name')} *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('common:customers.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-industry">{t('common:customers.industry')}</Label>
              <Input
                id="edit-industry"
                value={editIndustry}
                onChange={(e) => setEditIndustry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || updateMutation.isPending}>
              {t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent data-testid="modal-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common:customer_detail.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common:customer_detail.delete_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:customer_detail.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

function PortalUsersSection({ customerId }: { customerId: string }) {
  const { t } = useTranslation(['common']);
  const { data: portalUsers, isLoading, isError, refetch } = usePortalUsers(customerId);
  const createMutation = useCreatePortalUser();
  const updateMutation = useUpdatePortalUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<PortalUser | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');

  function openCreate() {
    setFormEmail('');
    setFormName('');
    setFormPassword('');
    setCreateOpen(true);
  }

  function openEdit(user: PortalUser) {
    setEditUser(user);
    setFormName(user.display_name);
  }

  function handleCreate() {
    if (!formEmail.trim() || !formName.trim() || !formPassword) return;
    createMutation.mutate(
      { customerId, email: formEmail.trim(), display_name: formName.trim(), password: formPassword },
      {
        onSuccess: () => {
          toast.success(t('common:portal_users.create_success'));
          setCreateOpen(false);
        },
      },
    );
  }

  function handleEditSave() {
    if (!editUser || !formName.trim()) return;
    updateMutation.mutate(
      { customerId, userId: editUser.id, display_name: formName.trim() },
      {
        onSuccess: () => {
          toast.success(t('common:portal_users.update_success'));
          setEditUser(null);
        },
      },
    );
  }

  function handleToggleActive(user: PortalUser) {
    updateMutation.mutate(
      { customerId, userId: user.id, is_active: user.is_active ? 0 : 1 },
      {
        onSuccess: () => {
          toast.success(t('common:portal_users.update_success'));
        },
      },
    );
  }

  return (
    <>
      <Card id="section-portal-users">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('common:portal_users.title')} ({portalUsers?.length ?? 0})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('common:portal_users.create')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-0 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 rounded" />)}
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 py-2">
              <p className="text-sm text-destructive">{t('common:status.error')}</p>
              <Button variant="ghost" size="sm" onClick={() => void refetch()}>
                <RefreshCw className="mr-1 h-3 w-3" />
                {t('common:actions.retry')}
              </Button>
            </div>
          ) : !portalUsers || portalUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">{t('common:portal_users.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{t('common:portal_users.email')}</TableHead>
                  <TableHead className="text-xs">{t('common:portal_users.name')}</TableHead>
                  <TableHead className="text-xs">{t('common:portal_users.status')}</TableHead>
                  <TableHead className="text-xs">{t('common:portal_users.last_login')}</TableHead>
                  <TableHead className="text-xs w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {portalUsers.map((pu) => (
                  <TableRow key={pu.id}>
                    <TableCell className="text-sm">{pu.email}</TableCell>
                    <TableCell className="text-sm">{pu.display_name}</TableCell>
                    <TableCell>
                      <Badge variant={pu.is_active ? 'default' : 'secondary'} className="text-xs">
                        {pu.is_active ? t('common:portal_users.active') : t('common:portal_users.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {pu.last_login ? new Date(pu.last_login).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pu)} aria-label={t('common:actions.edit')}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleActive(pu)}
                          disabled={updateMutation.isPending}
                          aria-label={t('common:actions.toggle_active')}
                        >
                          {pu.is_active ? <Trash2 className="h-3 w-3 text-destructive" /> : <Plus className="h-3 w-3 text-emerald-500" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Portal User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common:portal_users.create')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pu-email">{t('common:portal_users.email')} *</Label>
              <Input id="pu-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pu-name">{t('common:portal_users.name')} *</Label>
              <Input id="pu-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pu-password">{t('common:portal_users.password')} *</Label>
              <Input id="pu-password" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('common:actions.cancel')}</Button>
            <Button onClick={handleCreate} disabled={!formEmail.trim() || !formName.trim() || !formPassword || createMutation.isPending}>
              {t('common:actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Portal User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common:portal_users.edit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('common:portal_users.email')}</Label>
              <Input value={editUser?.email ?? ''} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pu-edit-name">{t('common:portal_users.name')} *</Label>
              <Input id="pu-edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>{t('common:actions.cancel')}</Button>
            <Button onClick={handleEditSave} disabled={!formName.trim() || updateMutation.isPending}>
              {t('common:actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  icon,
  label,
  value,
  sub,
  variant = 'default',
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  variant?: 'default' | 'destructive';
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? 'cursor-pointer transition-colors hover:bg-muted/50' : undefined}
      onClick={onClick}
    >
      <CardContent className="py-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${variant === 'destructive' && value > 0 ? 'text-destructive' : ''}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
