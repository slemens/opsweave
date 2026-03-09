import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  AlertTriangle,
  Server,
  GitPullRequest,
  ArrowRight,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
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
import { useTicketStats } from '@/api/tickets';
import { cn } from '@/lib/utils';

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
// Main Dashboard Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: stats, isLoading, isError, refetch } = useTicketStats();

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
          value="--"
          icon={Server}
          isLoading={false}
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

      {/* Quick overview cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Ticket overview */}
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
                <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{t('status.empty')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions / Assets placeholder */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t('nav.assets')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/assets')}
              className="text-xs gap-1"
            >
              {t('actions.view')}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Server className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{t('status.empty')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
