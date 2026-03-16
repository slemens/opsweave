import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  ClipboardCheck,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useComplianceDashboard } from '@/api/compliance';
import type { ComplianceDashboardData } from '@/api/compliance';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  major: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  minor: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  observation: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
};

const CONTROL_STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-500',
  implemented: 'bg-green-500',
  verified: 'bg-emerald-500',
  not_applicable: 'bg-gray-400',
};

const AUDIT_STATUS_COLORS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplianceDashboardTab() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- t is used in sub-components below
  const { t } = useTranslation(['compliance', 'common']);

  const { data: dashboardRaw, isLoading } = useComplianceDashboard();

  const dashboard = useMemo((): ComplianceDashboardData | null => {
    if (!dashboardRaw) return null;
    const raw = dashboardRaw as unknown;
    // Handle both direct object and { data: ... } wrapper
    if (typeof raw === 'object' && raw !== null && 'coverage' in raw) {
      return raw as ComplianceDashboardData;
    }
    if (typeof raw === 'object' && raw !== null && 'data' in raw) {
      return (raw as { data: ComplianceDashboardData }).data;
    }
    return null;
  }, [dashboardRaw]);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2" data-testid="dashboard-loading">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {/* Show empty state cards */}
        <CoverageSection coverage={[]} />
        <ControlStatusSection statuses={{}} />
        <FindingsSection findings={{ critical: 0, major: 0, minor: 0, observation: 0 }} />
        <RecentAuditsSection audits={[]} />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="compliance-dashboard">
      <div className="grid gap-4 md:grid-cols-2">
        <CoverageSection coverage={dashboard.coverage ?? []} />
        <ControlStatusSection statuses={dashboard.control_statuses ?? {}} />
        <FindingsSection
          findings={dashboard.open_findings ?? { critical: 0, major: 0, minor: 0, observation: 0 }}
        />
        <StaleControlsSection controls={dashboard.stale_controls ?? []} />
      </div>
      <RecentAuditsSection audits={dashboard.recent_audits ?? []} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coverage Overview
// ---------------------------------------------------------------------------

function CoverageSection({
  coverage,
}: {
  coverage: ComplianceDashboardData['coverage'];
}) {
  const { t } = useTranslation(['compliance']);

  return (
    <Card data-testid="coverage-overview">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {t('compliance:dashboard.coverage_overview')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {coverage.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('compliance:frameworks.empty')}
          </p>
        ) : (
          <div className="space-y-4">
            {coverage.map((fw) => {
              const pct = Math.round(fw.coverage_pct ?? 0);
              const variant = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';
              return (
                <div key={fw.framework_id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {fw.framework_name}
                      {fw.framework_version && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          v{fw.framework_version}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t('compliance:dashboard.coverage_pct', { pct })}
                    </span>
                  </div>
                  <Progress value={pct} variant={variant} height={6} />
                  <p className="text-xs text-muted-foreground">
                    {t('compliance:dashboard.requirements_mapped', {
                      mapped: fw.mapped_requirements ?? 0,
                      total: fw.total_requirements ?? 0,
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Control Status Breakdown
// ---------------------------------------------------------------------------

function ControlStatusSection({
  statuses,
}: {
  statuses: Record<string, number>;
}) {
  const { t } = useTranslation(['compliance']);

  const total = Object.values(statuses).reduce((sum, n) => sum + n, 0);
  const entries = Object.entries(statuses).filter(([, count]) => count > 0);

  return (
    <Card data-testid="control-status">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          {t('compliance:dashboard.control_status')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('compliance:controls.empty')}
          </p>
        ) : (
          <div className="space-y-3">
            {/* Horizontal stacked bar */}
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
              {entries.map(([status, count]) => {
                const pct = (count / total) * 100;
                return (
                  <div
                    key={status}
                    className={`${CONTROL_STATUS_COLORS[status] ?? 'bg-gray-400'} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${t(`compliance:controls.statuses.${status}`)}: ${count}`}
                  />
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3">
              {entries.map(([status, count]) => (
                <div key={status} className="flex items-center gap-1.5 text-xs">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${CONTROL_STATUS_COLORS[status] ?? 'bg-gray-400'}`}
                  />
                  <span className="text-muted-foreground">
                    {t(`compliance:controls.statuses.${status}`)}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Open Findings
// ---------------------------------------------------------------------------

function FindingsSection({
  findings,
}: {
  findings: ComplianceDashboardData['open_findings'];
}) {
  const { t } = useTranslation(['compliance']);

  const severities = ['critical', 'major', 'minor', 'observation'] as const;
  const hasFindings = severities.some((s) => (findings[s] ?? 0) > 0);

  return (
    <Card data-testid="open-findings">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {t('compliance:dashboard.open_findings')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasFindings ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('compliance:dashboard.no_findings')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {severities.map((sev) => {
              const count = findings[sev] ?? 0;
              const colors = SEVERITY_COLORS[sev] ?? { bg: '', text: '', badge: '' };
              return (
                <div
                  key={sev}
                  className={`rounded-lg border p-3 ${colors.bg}`}
                  data-testid={`findings-${sev}`}
                >
                  <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                  <p className={`text-xs ${colors.text} opacity-80`}>
                    {t(`compliance:dashboard.severity.${sev}`)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stale Controls
// ---------------------------------------------------------------------------

function StaleControlsSection({
  controls,
}: {
  controls: ComplianceDashboardData['stale_controls'];
}) {
  const { t } = useTranslation(['compliance']);

  return (
    <Card data-testid="stale-controls">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('compliance:dashboard.stale_controls')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('compliance:dashboard.stale_controls_hint')}
        </p>
      </CardHeader>
      <CardContent>
        {controls.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('compliance:dashboard.no_stale')}
          </p>
        ) : (
          <div className="space-y-2">
            {controls.map((ctrl) => (
              <div
                key={ctrl.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium">{ctrl.code}</span>
                  <span className="text-muted-foreground">{ctrl.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(ctrl.updated_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent Audits
// ---------------------------------------------------------------------------

function RecentAuditsSection({
  audits,
}: {
  audits: ComplianceDashboardData['recent_audits'];
}) {
  const { t } = useTranslation(['compliance']);

  return (
    <Card data-testid="recent-audits">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          {t('compliance:dashboard.recent_audits')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {audits.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('compliance:dashboard.no_audits')}
          </p>
        ) : (
          <div className="space-y-2">
            {audits.map((audit) => (
              <div
                key={audit.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{audit.name}</span>
                  <Badge className={`text-[10px] ${AUDIT_STATUS_COLORS[audit.status] ?? ''}`}>
                    {t(`compliance:audits.statuses.${audit.status}`)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {audit.auditor && <span>{audit.auditor}</span>}
                  <span>{audit.start_date ? new Date(audit.start_date).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
