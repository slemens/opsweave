import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useMonitoringSources,
  useMonitoringEvents,
  useMonitoringEventStats,
  useCreateMonitoringSource,
  useUpdateMonitoringSource,
  useDeleteMonitoringSource,
  useAcknowledgeEvent,
} from '@/api/monitoring';
import type { MonitoringSource, EventFilters } from '@/api/monitoring';
import { ApiRequestError } from '@/api/client';
import { cn } from '@/lib/utils';

// =============================================================================
// State badge helpers
// =============================================================================

const stateConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  ok: { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  warning: { icon: AlertTriangle, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  critical: { icon: AlertCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  unknown: { icon: HelpCircle, color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
};

function StateBadge({ state }: { state: string }) {
  const cfg = stateConfig[state] ?? stateConfig.unknown;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cfg.color)}>
      <Icon className="h-3 w-3" />
      {state.toUpperCase()}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// =============================================================================
// Source Dialog
// =============================================================================

interface SourceForm {
  name: string;
  type: string;
  url: string;
  username: string;
  password: string;
  api_key: string;
  poll_interval: number;
  is_active: boolean;
}

const BLANK_SOURCE: SourceForm = {
  name: '',
  type: 'checkmk_v2',
  url: '',
  username: '',
  password: '',
  api_key: '',
  poll_interval: 60,
  is_active: true,
};

function sourceToForm(s: MonitoringSource): SourceForm {
  const cfg = JSON.parse(s.config || '{}') as Record<string, unknown>;
  return {
    name: s.name,
    type: s.type,
    url: (cfg.url as string) || '',
    username: (cfg.username as string) || '',
    password: (cfg.password as string) || '',
    api_key: (cfg.api_key as string) || '',
    poll_interval: (cfg.poll_interval as number) || 60,
    is_active: s.is_active === 1,
  };
}

function formToPayload(form: SourceForm) {
  return {
    name: form.name,
    type: form.type,
    config: {
      url: form.url || undefined,
      username: form.username || undefined,
      password: form.password || undefined,
      api_key: form.api_key || undefined,
      poll_interval: form.poll_interval,
    },
    is_active: form.is_active,
  };
}

// =============================================================================
// Main Page
// =============================================================================

export function MonitoringPage() {
  const { t } = useTranslation('monitoring');
  const { t: tCommon } = useTranslation();

  // ── Events state ─────────────────────────────────────────
  const [eventFilters, setEventFilters] = useState<EventFilters>({ page: 1, limit: 25 });
  const [search, setSearch] = useState('');

  // ── Source dialog state ──────────────────────────────────
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<MonitoringSource | null>(null);
  const [sourceForm, setSourceForm] = useState<SourceForm>(BLANK_SOURCE);
  const [deleteTarget, setDeleteTarget] = useState<MonitoringSource | null>(null);
  const [showSecret, setShowSecret] = useState<string | null>(null);

  // ── Data ─────────────────────────────────────────────────
  const { data: sources, isLoading: sourcesLoading } = useMonitoringSources();
  const { data: eventsData, isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } = useMonitoringEvents({
    ...eventFilters,
    q: search || undefined,
  });
  const { data: stats } = useMonitoringEventStats();

  const createMutation = useCreateMonitoringSource();
  const updateMutation = useUpdateMonitoringSource();
  const deleteMutation = useDeleteMonitoringSource();
  const ackMutation = useAcknowledgeEvent();

  const events = eventsData?.data ?? [];
  const totalEvents = eventsData?.meta?.total ?? 0;
  const totalPages = Math.ceil(totalEvents / (eventFilters.limit ?? 25));

  const sourceList = sources ?? [];
  const sourceMap = new Map(sourceList.map((s) => [s.id, s]));

  // ── Handlers ─────────────────────────────────────────────

  const openCreateSource = useCallback(() => {
    setEditingSource(null);
    setSourceForm(BLANK_SOURCE);
    setSourceDialogOpen(true);
  }, []);

  const openEditSource = useCallback((source: MonitoringSource) => {
    setEditingSource(source);
    setSourceForm(sourceToForm(source));
    setSourceDialogOpen(true);
  }, []);

  const handleSaveSource = useCallback(async () => {
    if (!sourceForm.name.trim()) return;
    try {
      const payload = formToPayload(sourceForm);
      if (editingSource) {
        await updateMutation.mutateAsync({ id: editingSource.id, data: payload });
        toast.success(t('sources.updated'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('sources.created'));
      }
      setSourceDialogOpen(false);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : String(err);
      toast.error(msg);
    }
  }, [sourceForm, editingSource, createMutation, updateMutation, t]);

  const handleDeleteSource = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(t('sources.deleted'));
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : String(err);
      toast.error(msg);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, t]);

  const handleAcknowledge = useCallback(async (id: string) => {
    try {
      await ackMutation.mutateAsync(id);
    } catch {
      // ignore
    }
  }, [ackMutation]);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['ok', 'warning', 'critical', 'unknown'] as const).map((state) => {
          const cfg = stateConfig[state];
          const Icon = cfg.icon;
          const count = stats?.[state] ?? 0;
          return (
            <Card key={state} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEventFilters((f) => ({ ...f, state, page: 1 }))}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn('rounded-lg p-2', cfg.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{t(`stats.${state}`)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground -mt-4">{t('stats.last_24h')}</p>

      {/* Tabs */}
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">{t('tabs.events')}</TabsTrigger>
          <TabsTrigger value="sources">{t('tabs.sources')}</TabsTrigger>
        </TabsList>

        {/* ─── Events Tab ─────────────────────────────── */}
        <TabsContent value="events" className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder={t('events.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select
              value={eventFilters.state ?? 'all'}
              onValueChange={(v) => setEventFilters((f) => ({ ...f, state: v === 'all' ? undefined : v, page: 1 }))}
            >
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('events.all_states')}</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={eventFilters.source_id ?? 'all'}
              onValueChange={(v) => setEventFilters((f) => ({ ...f, source_id: v === 'all' ? undefined : v, page: 1 }))}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('events.all_sources')}</SelectItem>
                {sourceList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => void refetchEvents()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              {tCommon('actions.refresh', { defaultValue: 'Aktualisieren' })}
            </Button>
          </div>

          {/* Error */}
          {eventsError && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-8 gap-3">
              <AlertCircle className="h-8 w-8 text-destructive/60" />
              <Button variant="outline" size="sm" onClick={() => void refetchEvents()}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {tCommon('actions.retry', { defaultValue: 'Erneut versuchen' })}
              </Button>
            </div>
          )}

          {/* Events table */}
          {!eventsError && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[80px]">{t('events.state')}</TableHead>
                    <TableHead>{t('events.hostname')}</TableHead>
                    <TableHead>{t('events.service')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('events.output')}</TableHead>
                    <TableHead className="w-[120px]">{t('events.source')}</TableHead>
                    <TableHead className="w-[80px]">{t('events.ticket')}</TableHead>
                    <TableHead className="w-[140px]">{t('events.received')}</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <div className="flex flex-col items-center py-12 gap-2">
                          <Activity className="h-8 w-8 text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">{t('events.empty')}</p>
                          <p className="text-xs text-muted-foreground/70">{t('events.empty_hint')}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell><StateBadge state={event.state} /></TableCell>
                        <TableCell className="font-mono text-sm">{event.hostname}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{event.service_name ?? '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[300px] truncate">
                          {event.output ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {sourceMap.get(event.source_id)?.name ?? '—'}
                        </TableCell>
                        <TableCell>
                          {event.ticket_id ? (
                            <Link to={`/tickets/${event.ticket_id}`} className="text-xs text-primary hover:underline">
                              Ticket
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(event.received_at)}</TableCell>
                        <TableCell>
                          {!event.processed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={t('events.acknowledge')}
                              onClick={() => void handleAcknowledge(event.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {t('events.source')}: {totalEvents}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(eventFilters.page ?? 1) <= 1}
                  onClick={() => setEventFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  ←
                </Button>
                <span>{eventFilters.page ?? 1} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(eventFilters.page ?? 1) >= totalPages}
                  onClick={() => setEventFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  →
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Sources Tab ────────────────────────────── */}
        <TabsContent value="sources" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('sources.title')}</h2>
            <Button onClick={openCreateSource} size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t('sources.create')}
            </Button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>{t('sources.name')}</TableHead>
                  <TableHead className="w-[180px]">{t('sources.type')}</TableHead>
                  <TableHead className="w-[100px]">{t('sources.status')}</TableHead>
                  <TableHead className="w-[250px]">{t('sources.webhook_url')}</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourcesLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sourceList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="flex flex-col items-center py-12 gap-2">
                        <Activity className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">{t('sources.empty')}</p>
                        <p className="text-xs text-muted-foreground/70">{t('sources.empty_hint')}</p>
                        <Button variant="outline" size="sm" onClick={openCreateSource}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          {t('sources.create')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sourceList.map((source) => {
                    const webhookUrl = `${window.location.origin}/api/v1/monitoring/events/webhook/${source.id}`;
                    return (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium text-sm">{source.name}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className="text-xs">
                            {t(`sources.types.${source.type}`, { defaultValue: source.type })}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {source.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs">
                              {t('sources.active')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t('sources.inactive')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs text-muted-foreground truncate max-w-[180px]">{webhookUrl}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => { void navigator.clipboard.writeText(webhookUrl); toast.success('URL kopiert'); }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => setShowSecret(showSecret === source.id ? null : source.id)}
                            >
                              {showSecret === source.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                          {showSecret === source.id && source.webhook_secret && (
                            <div className="flex items-center gap-1 mt-1">
                              <code className="text-[10px] text-muted-foreground font-mono break-all">
                                Secret: {source.webhook_secret}
                              </code>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditSource(source)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                {tCommon('actions.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(source)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                {tCommon('actions.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Source Create/Edit Dialog */}
      <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? t('sources.edit') : t('sources.create')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('sources.name')} *</Label>
              <Input
                value={sourceForm.name}
                onChange={(e) => setSourceForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('sources.name')}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('sources.type')}</Label>
              <Select value={sourceForm.type} onValueChange={(v) => setSourceForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['checkmk_v2', 'checkmk_v1', 'zabbix', 'prometheus', 'nagios', 'other'].map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`sources.types.${type}`, { defaultValue: type })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t('sources.url')}</Label>
              <Input
                value={sourceForm.url}
                onChange={(e) => setSourceForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://checkmk.example.com/site/check_mk/api/1.0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('sources.username')}</Label>
                <Input
                  value={sourceForm.username}
                  onChange={(e) => setSourceForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('sources.password')}</Label>
                <Input
                  type="password"
                  value={sourceForm.password}
                  onChange={(e) => setSourceForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('sources.poll_interval')}</Label>
              <Input
                type="number"
                min={10}
                value={sourceForm.poll_interval}
                onChange={(e) => setSourceForm((f) => ({ ...f, poll_interval: Number(e.target.value) }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={sourceForm.is_active}
                onCheckedChange={(v) => setSourceForm((f) => ({ ...f, is_active: v }))}
              />
              <Label>{t('sources.active')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSourceDialogOpen(false)} disabled={isSaving}>
              {tCommon('actions.cancel')}
            </Button>
            <Button onClick={() => void handleSaveSource()} disabled={isSaving || !sourceForm.name.trim()}>
              {isSaving ? '...' : tCommon('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon('actions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sources.delete_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDeleteSource()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tCommon('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
