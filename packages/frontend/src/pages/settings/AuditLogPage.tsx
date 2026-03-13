import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Download,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  useAuditLogs,
  useAuditEventTypes,
  useAuditResourceTypes,
  useAuditIntegrity,
  getAuditExportUrl,
} from '@/api/audit';
import type { AuditLogEntry, AuditLogParams } from '@/api/audit';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(iso));
}

function eventBadgeVariant(eventType: string): string {
  if (eventType.startsWith('auth.')) return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
  if (eventType.startsWith('license.')) return 'bg-purple-500/15 text-purple-600 dark:text-purple-400';
  if (eventType.startsWith('settings.')) return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
  if (eventType.startsWith('user.')) return 'bg-green-500/15 text-green-600 dark:text-green-400';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400';
}

const ALL_VALUE = '__all__';

export default function AuditLogPage() {
  const { t } = useTranslation(['settings', 'common']);
  const [params, setParams] = useState<AuditLogParams>({
    page: 1,
    limit: 25,
  });
  const [search, setSearch] = useState('');

  const [verifyEnabled, setVerifyEnabled] = useState(false);

  const { data: response, isLoading } = useAuditLogs(params);
  const { data: eventTypes } = useAuditEventTypes();
  const { data: resourceTypes } = useAuditResourceTypes();
  const { data: integrityRaw, isLoading: verifying, isFetched: verifyDone } = useAuditIntegrity(verifyEnabled);
  const integrity = integrityRaw as unknown as { data: { valid: boolean; totalChecked: number; firstInvalidIndex: number } } | undefined;

  const logs = (response as unknown as { data: AuditLogEntry[]; meta: { total: number; page: number; totalPages: number } } | undefined)?.data ?? [];
  const meta = (response as unknown as { data: AuditLogEntry[]; meta: { total: number; page: number; totalPages: number } } | undefined)?.meta;
  const totalPages = meta?.totalPages ?? 1;

  function handleSearch() {
    setParams(p => ({ ...p, q: search || undefined, page: 1 }));
  }

  return (
    <div className="space-y-6" data-testid="page-audit-log">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">
                  {t('settings:audit.title')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('settings:audit.description')}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Integrity verification */}
              {verifyDone && integrity?.data ? (
                <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md ${
                  integrity.data.valid
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}>
                  {integrity.data.valid
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : <XCircle className="h-3.5 w-3.5" />}
                  {integrity.data.valid
                    ? t('settings:audit.integrity_valid', { count: integrity.data.totalChecked })
                    : t('settings:audit.integrity_invalid', { index: integrity.data.firstInvalidIndex })}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="btn-verify-integrity"
                  onClick={() => setVerifyEnabled(true)}
                  disabled={verifying}
                >
                  {verifying
                    ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                  {t('settings:audit.verify_integrity')}
                </Button>
              )}

              {/* Export */}
              <Button
                variant="outline"
                size="sm"
                data-testid="btn-export-csv"
                onClick={() => window.open(getAuditExportUrl('csv', params), '_blank')}
              >
                <Download className="h-4 w-4 mr-1.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="btn-export-json"
                onClick={() => window.open(getAuditExportUrl('json', params), '_blank')}
              >
                <Download className="h-4 w-4 mr-1.5" />
                JSON
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
              <Input
                data-testid="input-audit-search"
                placeholder={t('settings:audit.search_placeholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                className="flex-1"
              />
              <Button variant="outline" size="icon" data-testid="btn-audit-search" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={params.event_type ?? ALL_VALUE}
              onValueChange={v => setParams(p => ({ ...p, event_type: v === ALL_VALUE ? undefined : v, page: 1 }))}
            >
              <SelectTrigger className="w-48" data-testid="select-audit-event-type">
                <SelectValue placeholder={t('settings:audit.all_events')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t('settings:audit.all_events')}</SelectItem>
                {(eventTypes ?? []).map(et => (
                  <SelectItem key={et} value={et}>{et}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={params.resource_type ?? ALL_VALUE}
              onValueChange={v => setParams(p => ({ ...p, resource_type: v === ALL_VALUE ? undefined : v, page: 1 }))}
            >
              <SelectTrigger className="w-48" data-testid="select-audit-resource-type">
                <SelectValue placeholder={t('settings:audit.all_resources')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t('settings:audit.all_resources')}</SelectItem>
                {(resourceTypes ?? []).map(rt => (
                  <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('settings:audit.empty')}</p>
              <p className="text-xs mt-1">{t('settings:audit.empty_hint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-audit-logs">
                <thead>
                  <tr className="border-b dark:border-slate-700 text-left text-muted-foreground">
                    <th className="pb-2 font-medium">{t('settings:audit.columns.time')}</th>
                    <th className="pb-2 font-medium">{t('settings:audit.columns.actor')}</th>
                    <th className="pb-2 font-medium">{t('settings:audit.columns.event')}</th>
                    <th className="pb-2 font-medium">{t('settings:audit.columns.resource')}</th>
                    <th className="pb-2 font-medium">{t('settings:audit.columns.ip')}</th>
                    <th className="pb-2 font-medium">{t('settings:audit.columns.details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b dark:border-slate-700 last:border-0 hover:bg-muted/50">
                      <td className="py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-2.5 text-xs">
                        {log.actor_email}
                      </td>
                      <td className="py-2.5">
                        <Badge className={`text-xs ${eventBadgeVariant(log.event_type)}`}>
                          {log.event_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {log.resource_type}
                        {log.resource_id && (
                          <span className="text-[10px] ml-1 opacity-60">
                            {log.resource_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground font-mono">
                        {log.ip_address ?? '-'}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                        {Object.keys(log.details).length > 0
                          ? JSON.stringify(log.details)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {t('settings:audit.page_info', {
                  page: params.page ?? 1,
                  total: totalPages,
                  count: meta?.total ?? 0,
                })}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  data-testid="btn-audit-prev-page"
                  disabled={(params.page ?? 1) <= 1}
                  onClick={() => setParams(p => ({ ...p, page: (p.page ?? 1) - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  data-testid="btn-audit-next-page"
                  disabled={(params.page ?? 1) >= totalPages}
                  onClick={() => setParams(p => ({ ...p, page: (p.page ?? 1) + 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
