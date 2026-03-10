import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Building2,
  Mail,
  Server,
  Ticket,
  AlertTriangle,
  Clock,
  ShieldCheck,
  BookOpen,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
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
import { useCustomerOverview } from '@/api/tickets';

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

  const { data: overview, isLoading, isError } = useCustomerOverview(id);

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
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-red-400">{t('common:load_error')}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common:actions.back')}
        </Button>
      </div>
    );
  }

  const { customer, stats, assets, recent_tickets, sla, vertical_catalogs } = overview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
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
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<Server className="h-4 w-4" />}
          label={t('cmdb:title')}
          value={stats.total_assets}
        />
        <KpiCard
          icon={<Ticket className="h-4 w-4" />}
          label={t('common:nav.tickets')}
          value={stats.total_tickets}
          sub={`${stats.open_tickets} ${t('common:customer_detail.open')}`}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          label={t('common:customer_detail.sla_breaches')}
          value={stats.sla_breached_tickets}
          variant={stats.sla_breached_tickets > 0 ? 'destructive' : 'default'}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label={t('common:customer_detail.portal_users')}
          value={stats.portal_users}
        />
        <KpiCard
          icon={<BookOpen className="h-4 w-4" />}
          label={t('catalog:vertical.title')}
          value={vertical_catalogs.length}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SLA */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-4">
            {sla.definition ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{sla.definition.name}</span>
                  <Badge variant="outline" className="text-xs">{sla.definition.business_hours}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common:customer_detail.response_time')}</p>
                    <p className="font-medium">{formatMinutes(sla.definition.response_time_minutes)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common:customer_detail.resolution_time')}</p>
                    <p className="font-medium">{formatMinutes(sla.definition.resolution_time_minutes)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">{t('common:customer_detail.no_sla')}</p>
            )}
          </CardContent>
        </Card>

        {/* Vertical Catalogs */}
        <Card>
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
                  <div key={vc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-sm font-medium">{vc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('catalog:fields.base_catalog')}: {vc.base_catalog_name}
                        {vc.override_count > 0 && ` — ${vc.override_count} Overrides`}
                      </p>
                    </div>
                    <Badge variant={vc.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {vc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assets */}
      <Card>
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
                  <TableHead className="text-xs">SLA</TableHead>
                  <TableHead className="text-xs w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/assets/${asset.id}`)}>
                    <TableCell className="text-sm font-medium">{asset.display_name}</TableCell>
                    <TableCell className="text-xs">{asset.asset_type}</TableCell>
                    <TableCell>
                      <Badge variant={asset.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{asset.sla_tier}</TableCell>
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
      <Card>
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
                  <TableHead className="text-xs">{t('common:created_at')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent_tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    <TableCell className="text-xs font-mono">{ticket.ticket_number}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{ticket.title}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ticket.status] ?? ''}`}>
                        {ticket.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[ticket.priority] ?? ''}`}>
                        {ticket.priority}
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
    </div>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  variant?: 'default' | 'destructive';
}) {
  return (
    <Card>
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
