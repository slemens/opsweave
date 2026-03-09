import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  AlertTriangle,
  Server,
  GitPullRequest,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { useTicketStats, useTickets, useTicketTimeline, useTicketsByCustomer } from '@/api/tickets';
import { useAssetStats } from '@/api/assets';
import { cn, formatRelativeTime } from '@/lib/utils';

const BAR_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

// ---------------------------------------------------------------------------
// Stat Card Component
// ---------------------------------------------------------------------------

interface StatCardProps {
  titleKey: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  variant?: 'default' | 'warning' | 'danger';
  onClick?: () => void;
}

function StatCard({
  titleKey,
  value,
  icon: Icon,
  isLoading,
  variant = 'default',
  onClick,
}: StatCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/20',
        variant === 'warning' && 'border-amber-300/50 dark:border-amber-700/50',
        variant === 'danger' && 'border-destructive/30',
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t(titleKey)}
        </CardTitle>
        <div className={cn(
          'rounded-md p-2',
          variant === 'default' && 'bg-primary/10',
          variant === 'warning' && 'bg-amber-100 dark:bg-amber-900/30',
          variant === 'danger' && 'bg-destructive/10',
        )}>
          <Icon className={cn(
            'h-4 w-4',
            variant === 'default' && 'text-primary',
            variant === 'warning' && 'text-amber-600 dark:text-amber-400',
            variant === 'danger' && 'text-destructive',
          )} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold tabular-nums">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status badge variant helper
// ---------------------------------------------------------------------------

function getStatusVariant(status: string): 'default' | 'warning' | 'secondary' | 'success' | 'outline' {
  const map: Record<string, 'default' | 'warning' | 'secondary' | 'success' | 'outline'> = {
    open: 'default',
    in_progress: 'warning',
    pending: 'secondary',
    resolved: 'success',
    closed: 'outline',
  };
  return map[status] ?? 'secondary';
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading, isError, refetch } = useTicketStats();
  const { data: assetStats, isLoading: isLoadingAssets } = useAssetStats();
  const { data: recentTicketsData, isLoading: isLoadingRecent } = useTickets({
    limit: 5,
    sort: 'created_at',
    order: 'desc',
  });
  const { data: timelineData, isLoading: isLoadingTimeline } = useTicketTimeline(30);
  const { data: customerData, isLoading: isLoadingCustomers } = useTicketsByCustomer(5);

  const recentTickets = recentTicketsData?.data ?? [];
  const timelineChartData = timelineData ?? [];
  const customerChartData = customerData ?? [];

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t('dashboard.welcome')}, {user?.displayName}
          </h2>
          <p className="text-muted-foreground">
            {t('app.claim')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
          aria-label={t('actions.refresh')}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          {t('actions.refresh')}
        </Button>
      </div>

      {/* Error state */}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{t('errors.generic')}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="ml-auto shrink-0"
            >
              {t('actions.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          titleKey="dashboard.open_tickets"
          value={stats?.by_status?.open ?? 0}
          icon={Ticket}
          isLoading={isLoading}
          onClick={() => navigate('/tickets')}
        />
        <StatCard
          titleKey="dashboard.sla_breaches"
          value={stats?.sla_breached ?? 0}
          icon={AlertTriangle}
          isLoading={isLoading}
          variant={stats && stats.sla_breached > 0 ? 'danger' : 'default'}
          onClick={() => navigate('/tickets')}
        />
        <StatCard
          titleKey="dashboard.assets_total"
          value={assetStats?.total ?? '--'}
          icon={Server}
          isLoading={isLoadingAssets}
          onClick={() => navigate('/assets')}
        />
        <StatCard
          titleKey="dashboard.pending_changes"
          value={stats?.by_status?.pending ?? 0}
          icon={GitPullRequest}
          isLoading={isLoading}
          variant={stats && (stats.by_status?.pending ?? 0) > 0 ? 'warning' : 'default'}
          onClick={() => navigate('/tickets')}
        />
      </div>

      {/* Chart cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Timeline chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.ticket_timeline')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTimeline ? (
              <Skeleton className="h-[220px] w-full" />
            ) : timelineChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[220px] text-center">
                <Ticket className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('status.empty')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timelineChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getDate()}.${d.getMonth() + 1}.`;
                    }}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    labelFormatter={(v) => new Date(String(v)).toLocaleDateString('de-DE')}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top customers chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.top_customers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCustomers ? (
              <Skeleton className="h-[220px] w-full" />
            ) : customerChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[220px] text-center">
                <Ticket className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('status.empty')}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={customerChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} className="text-muted-foreground" />
                  <YAxis
                    type="category"
                    dataKey="customer_name"
                    tick={{ fontSize: 11 }}
                    width={90}
                    tickFormatter={(v: string) => v.length > 12 ? `${v.slice(0, 12)}…` : v}
                    className="text-muted-foreground"
                  />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {customerChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick overview cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Ticket status overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('nav.tickets')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tickets')}
              className="text-xs gap-1"
            >
              {t('actions.view')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats ? (
              <div className="space-y-2">
                {(['open', 'in_progress', 'pending', 'resolved', 'closed'] as const).map((status) => {
                  const count = stats.by_status?.[status] ?? 0;
                  const total = stats.total || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-28 shrink-0">
                        {t(`tickets:statuses.${status}`, { defaultValue: status })}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            status === 'open' && 'bg-blue-500',
                            status === 'in_progress' && 'bg-amber-500',
                            status === 'pending' && 'bg-orange-500',
                            status === 'resolved' && 'bg-emerald-500',
                            status === 'closed' && 'bg-slate-400 dark:bg-slate-500',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <Badge variant="secondary" className="text-xs tabular-nums min-w-[2rem] justify-center">
                        {count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Ticket className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('status.empty')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent tickets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('dashboard.recent_tickets')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tickets')}
              className="text-xs gap-1"
            >
              {t('actions.view')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingRecent ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('status.empty')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    className="w-full flex items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-muted/50 transition-colors group"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <span className="font-mono text-xs text-muted-foreground shrink-0 w-28 truncate">
                      {ticket.ticket_number}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {ticket.title}
                    </span>
                    <Badge variant={getStatusVariant(ticket.status)} className="text-xs shrink-0">
                      {t(`tickets:statuses.${ticket.status}`, { defaultValue: ticket.status })}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {formatRelativeTime(ticket.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
