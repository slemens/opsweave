import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  TrendingDown,
  AlertCircle,
  RefreshCw,
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
import { useSlaPerformanceReport } from '@/api/sla';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Priority color mapping
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#6b7280',
};

const TYPE_COLORS: Record<string, string> = {
  incident: '#ef4444',
  problem: '#f97316',
  change: '#3b82f6',
  request: '#8b5cf6',
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

function StatCard({ title, value, subtitle, icon, variant = 'default' }: StatCardProps) {
  const variantClasses = {
    default: 'bg-card',
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
  };

  return (
    <Card className={cn('transition-shadow hover:shadow-md', variantClasses[variant])}>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-5">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="py-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SlaReportsPage() {
  const { t } = useTranslation('sla');
  const [days, setDays] = useState(30);
  const { data: report, isLoading, error, refetch } = useSlaPerformanceReport(days);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
        <p className="mb-4 text-sm text-muted-foreground">{t('reports.error')}</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t('reports.retry')}
        </Button>
      </div>
    );
  }

  const complianceRate = report ? (100 - report.summary.breach_rate) : 0;

  return (
    <div className="space-y-6" data-testid="page-sla-reports">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-40" data-testid="select-sla-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('reports.days_7')}</SelectItem>
            <SelectItem value="14">{t('reports.days_14')}</SelectItem>
            <SelectItem value="30">{t('reports.days_30')}</SelectItem>
            <SelectItem value="90">{t('reports.days_90')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading || !report ? (
        <ReportSkeleton />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t('reports.total_tickets')}
              value={report.summary.total_tickets}
              subtitle={t('reports.with_sla', { count: report.summary.total_with_sla })}
              icon={<ShieldCheck className="h-6 w-6 text-blue-600" />}
            />
            <StatCard
              title={t('reports.compliance_rate')}
              value={`${complianceRate.toFixed(1)}%`}
              variant={complianceRate >= 95 ? 'success' : complianceRate >= 80 ? 'warning' : 'danger'}
              icon={<ShieldAlert className="h-6 w-6 text-emerald-600" />}
            />
            <StatCard
              title={t('reports.breached')}
              value={report.summary.total_breached}
              subtitle={`${report.summary.breach_rate}% ${t('reports.breach_rate')}`}
              variant={report.summary.total_breached > 0 ? 'danger' : 'success'}
              icon={<TrendingDown className="h-6 w-6 text-red-500" />}
            />
            <StatCard
              title={t('reports.avg_resolution')}
              value={report.summary.avg_resolution_hours !== null
                ? `${report.summary.avg_resolution_hours}h`
                : '—'}
              icon={<Clock className="h-6 w-6 text-amber-500" />}
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Breach Trend Chart */}
            <Card data-testid="card-breach-trend">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{t('reports.breach_trend')}</CardTitle>
              </CardHeader>
              <CardContent>
                {report.breach_trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={report.breach_trend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: string) => v.slice(5)}
                        className="text-muted-foreground"
                      />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name={t('reports.total_label')}
                      />
                      <Line
                        type="monotone"
                        dataKey="breached"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        name={t('reports.breached_label')}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    {t('reports.no_data')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Type Chart */}
            <Card data-testid="card-sla-by-type">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">{t('reports.by_type')}</CardTitle>
              </CardHeader>
              <CardContent>
                {report.by_type.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={report.by_type}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="ticket_type"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="total" name={t('reports.total_label')} radius={[4, 4, 0, 0]}>
                        {report.by_type.map((entry) => (
                          <Cell key={entry.ticket_type} fill={TYPE_COLORS[entry.ticket_type] ?? '#6b7280'} />
                        ))}
                      </Bar>
                      <Bar dataKey="breached" name={t('reports.breached_label')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    {t('reports.no_data')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* By Priority Table */}
          <Card data-testid="card-sla-by-priority">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{t('reports.by_priority')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-sla-priority">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">{t('reports.col_priority')}</TableHead>
                    <TableHead className="text-right font-semibold">{t('reports.col_total')}</TableHead>
                    <TableHead className="text-right font-semibold">{t('reports.col_breached')}</TableHead>
                    <TableHead className="text-right font-semibold">{t('reports.col_breach_rate')}</TableHead>
                    <TableHead className="text-right font-semibold">{t('reports.col_avg_resolution')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.by_priority.map((row) => (
                    <TableRow key={row.priority}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{ borderColor: PRIORITY_COLORS[row.priority] ?? '#6b7280', color: PRIORITY_COLORS[row.priority] ?? '#6b7280' }}
                        >
                          {row.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{row.total}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={row.breached > 0 ? 'text-red-500 font-semibold' : ''}>{row.breached}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className={row.breach_rate > 10 ? 'text-red-500' : row.breach_rate > 0 ? 'text-amber-500' : 'text-emerald-500'}>
                          {row.breach_rate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.avg_resolution_hours !== null ? `${row.avg_resolution_hours}h` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {report.by_priority.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {t('reports.no_data')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
