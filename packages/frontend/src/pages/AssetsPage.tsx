import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Server,
  FilterX,
  Network,
} from 'lucide-react';
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  type Node as RFNode,
  type Edge as RFEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useFullAssetGraph } from '@/api/assets';
import { applyDagreLayout } from '@/lib/graph-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import {
  useAssets,
} from '@/api/assets';
import { useCustomers } from '@/api/customers';
import type { AssetListParams, AssetWithRelations } from '@/api/assets';
import type { AssetStatus } from '@opsweave/shared';
import { ASSET_STATUSES, SLA_TIERS, ENVIRONMENTS, ASSET_TYPE_CATEGORIES } from '@opsweave/shared';
import { useAssetTypes } from '@/api/asset-types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  decommissioned: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const slaColors: Record<string, string> = {
  platinum: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  silver: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  bronze: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  none: 'bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400',
};

/** Category keys for the filter buttons (all + each group) */
const CATEGORY_KEYS = ['all', ...ASSET_TYPE_CATEGORIES] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetsPage() {
  const { t } = useTranslation('cmdb');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();

  // ── View Toggle ───────────────────────────────────────────
  const [globalGraphView, setGlobalGraphView] = useState(false);

  // ── Filter State ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sortField] = useState('created_at');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  // ── Asset Types from API ─────────────────────────────────
  const { data: assetTypesData } = useAssetTypes();
  const assetTypeGroups = useMemo(() => {
    const types = assetTypesData ?? [];
    const grouped: Record<string, string[]> = {};
    for (const t of types) {
      const cat = t.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t.slug);
    }
    return ASSET_TYPE_CATEGORIES
      .filter((cat) => grouped[cat]?.length)
      .map((cat) => ({ category: cat, types: grouped[cat] ?? [] }));
  }, [assetTypesData]);

  /** Lookup map: slug → name (from API or fallback to i18n) */
  const typeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const at of assetTypesData ?? []) {
      map.set(at.slug, at.name);
    }
    return map;
  }, [assetTypesData]);

  /** Helper to get display name for a type slug */
  const getTypeName = useCallback((slug: string) => {
    const i18nKey = `types.${slug}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
    return typeNameMap.get(slug) ?? slug;
  }, [t, typeNameMap]);

  // ── Data ──────────────────────────────────────────────────
  const listParams: AssetListParams = useMemo(() => {
    const params: AssetListParams = { page, limit: 25, sort: sortField, order: sortOrder };
    if (searchQuery) params.q = searchQuery;
    if (typeFilter !== 'all') {
      params.asset_type = typeFilter as string;
    } else if (categoryFilter !== 'all') {
      const group = assetTypeGroups.find((g) => g.category === categoryFilter);
      if (group) params.asset_types = group.types.join(',');
    }
    if (statusFilter !== 'all') params.status = statusFilter as AssetStatus;
    if (slaFilter !== 'all') params.sla_tier = slaFilter as AssetListParams['sla_tier'];
    if (envFilter !== 'all') params.environment = envFilter as AssetListParams['environment'];
    if (customerFilter !== 'all') params.customer_id = customerFilter;
    return params;
  }, [page, sortField, sortOrder, searchQuery, categoryFilter, typeFilter, statusFilter, slaFilter, envFilter, customerFilter]);

  const { data, isLoading, isError, refetch } = useAssets(listParams);
  const { data: customersData } = useCustomers();
  const { data: fullGraph, isLoading: graphLoading } = useFullAssetGraph();

  const assetList = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const customerOptions = useMemo(() => {
    const list = customersData?.data ?? [];
    return list.map((c) => ({ value: c.id, label: c.name }));
  }, [customersData]);

  const hasActiveFilters = categoryFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || slaFilter !== 'all' || envFilter !== 'all' || customerFilter !== 'all' || searchQuery !== '';

  // ── Global Topology Graph ─────────────────────────────────

  const assetTypeColors: Record<string, string> = {
    server_physical: '#0f766e',
    server_virtual: '#0369a1',
    virtualization_host: '#0369a1',
    container: '#1d4ed8',
    container_host: '#1d4ed8',
    network_switch: '#7c3aed',
    network_router: '#6d28d9',
    network_firewall: '#b91c1c',
    network_load_balancer: '#9f1239',
    network_wap: '#c2410c',
    rack: '#92400e',
    storage_san: '#065f46',
    storage_nas: '#065f46',
    storage_backup: '#064e3b',
    database: '#86198f',
    application: '#0c4a6e',
    service: '#0c4a6e',
    middleware: '#1e3a5f',
    cluster: '#1e3a5f',
    workstation: '#374151',
    laptop: '#374151',
    printer: '#374151',
  };

  const { globalNodes, globalEdges } = useMemo(() => {
    if (!fullGraph?.nodes?.length) return { globalNodes: [], globalEdges: [] };

    const rawNodes: RFNode[] = fullGraph.nodes.map((n) => ({
      id: n.id,
      data: {
        label: (
          <div style={{ textAlign: 'center', fontSize: 11 }}>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{n.display_name || n.name}</div>
            <div style={{ opacity: 0.65, fontSize: 10 }}>{n.asset_type}</div>
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        background: assetTypeColors[n.asset_type] ?? '#334155',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        width: 160,
        padding: '6px 10px',
      },
    }));

    const rawEdges: RFEdge[] = fullGraph.edges.map((e) => ({
      id: e.id,
      source: e.source_asset_id,
      target: e.target_asset_id,
      label: e.relation_type,
      labelStyle: { fontSize: 9, fill: '#94a3b8' },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      style: { stroke: '#475569' },
      type: 'smoothstep' as const,
    }));

    const layout = applyDagreLayout(rawNodes, rawEdges, 'LR');
    return { globalNodes: layout.nodes, globalEdges: layout.edges };
  }, [fullGraph]);

  // ── Handlers ──────────────────────────────────────────────

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setSlaFilter('all');
    setEnvFilter('all');
    setCustomerFilter('all');
    setPage(1);
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  }, []);

  // ── Filter Head ───────────────────────────────────────────

  function FilterHead({
    label,
    filterValue,
    onFilterChange,
    options,
    allLabel,
  }: {
    label: string;
    filterValue: string;
    onFilterChange: (v: string) => void;
    options: Array<{ value: string; label: string }>;
    allLabel: string;
  }) {
    return (
      <TableHead className="p-0">
        <div className="flex flex-col">
          <span className="flex items-center px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
            {label}
          </span>
          <div className="px-2 pb-1.5">
            <Select value={filterValue} onValueChange={onFilterChange}>
              <SelectTrigger className="h-6 text-[11px] border-dashed min-w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{allLabel}</SelectItem>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TableHead>
    );
  }

  // ── Type / Status / SLA options ───────────────────────────

  const typeOptions = useMemo(() => {
    const allTypes = assetTypesData ?? [];
    if (categoryFilter !== 'all') {
      return allTypes
        .filter((at) => at.category === categoryFilter)
        .map((at) => ({ value: at.slug, label: getTypeName(at.slug) }));
    }
    return allTypes.map((at) => ({ value: at.slug, label: getTypeName(at.slug) }));
  }, [assetTypesData, categoryFilter, getTypeName]);

  const statusOptions = useMemo(() =>
    ASSET_STATUSES.map((s) => ({ value: s, label: t(`statuses.${s}`) })),
    [t],
  );

  const slaOptions = useMemo(() =>
    SLA_TIERS.map((s) => ({ value: s, label: t(`sla_tiers.${s}`) })),
    [t],
  );

  const envOptions = useMemo(() =>
    ENVIRONMENTS.map((e) => ({ value: e, label: t(`environments.${e}`) })),
    [t],
  );

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-4" data-testid="page-assets">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          {meta && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('list.showing', { count: meta.total })}
            </p>
          )}
        </div>
        <Button onClick={() => navigate('/assets/new')} data-testid="btn-create-asset">
          <Plus className="mr-2 h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setGlobalGraphView(false)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !globalGraphView ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          data-testid="btn-view-table"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          {t('view_table')}
        </button>
        <button
          onClick={() => setGlobalGraphView(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            globalGraphView ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          data-testid="btn-view-topology"
        >
          <Network size={14} />
          {t('view_topology')}
        </button>
      </div>

      {/* Category filter buttons + Search (table view only) */}
      {!globalGraphView && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {CATEGORY_KEYS.map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-7 text-xs whitespace-nowrap',
                  categoryFilter === cat && 'pointer-events-none',
                )}
                onClick={() => {
                  setCategoryFilter(cat);
                  setTypeFilter('all');
                  setPage(1);
                }}
              >
                {t(`type_categories.${cat}`)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={`${tCommon('actions.search')}...`}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                data-testid="input-search-assets"
              />
            </form>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground" data-testid="btn-reset-filters">
                <FilterX className="mr-1.5 h-4 w-4" />
                {tCommon('actions.reset')}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table (table view only) */}
      {!globalGraphView && (
        isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-destructive/10 p-3 mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{tCommon('status.error')}</p>
            <p className="text-sm text-muted-foreground mb-4">{tCommon('errors.generic')}</p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {tCommon('actions.retry')}
            </Button>
          </div>
        ) : assetList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Server className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{t('list.empty')}</p>
            <p className="text-sm text-muted-foreground mb-4">{t('list.empty_hint')}</p>
            <Button onClick={() => navigate('/assets/new')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('create')}
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table data-testid="table-assets">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[220px]">
                      <span className="flex items-center px-1 pt-1 text-xs font-medium text-muted-foreground">
                        {t('fields.display_name')}
                      </span>
                    </TableHead>
                    <FilterHead
                      label={t('fields.asset_type')}
                      filterValue={typeFilter}
                      onFilterChange={(v) => { setTypeFilter(v); setPage(1); }}
                      options={typeOptions}
                      allLabel={t('filter_all_types')}
                    />
                    <FilterHead
                      label={t('fields.status')}
                      filterValue={statusFilter}
                      onFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
                      options={statusOptions}
                      allLabel={t('filter_all_statuses')}
                    />
                    <TableHead>
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('fields.ip_address')}
                      </span>
                    </TableHead>
                    <TableHead>
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('fields.location')}
                      </span>
                    </TableHead>
                    <FilterHead
                      label={t('fields.sla_tier')}
                      filterValue={slaFilter}
                      onFilterChange={(v) => { setSlaFilter(v); setPage(1); }}
                      options={slaOptions}
                      allLabel={t('filter_all_sla')}
                    />
                    <FilterHead
                      label={t('fields.environment')}
                      filterValue={envFilter}
                      onFilterChange={(v) => { setEnvFilter(v); setPage(1); }}
                      options={envOptions}
                      allLabel={t('filter_all_environments')}
                    />
                    <FilterHead
                      label={t('fields.customer')}
                      filterValue={customerFilter}
                      onFilterChange={(v) => { setCustomerFilter(v); setPage(1); }}
                      options={customerOptions}
                      allLabel={t('filter_all_customers')}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetList.map((asset: AssetWithRelations) => (
                    <TableRow
                      key={asset.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/assets/${asset.id}`)}
                      data-testid={`row-asset-${asset.id}`}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <span className="text-sm">{asset.display_name}</span>
                          <span className="block text-xs text-muted-foreground font-mono">{asset.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {getTypeName(asset.asset_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs border', statusColors[asset.status] ?? '')}>
                          {t(`statuses.${asset.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono text-muted-foreground">
                          {asset.ip_address ?? '\u2014'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {asset.location ?? '\u2014'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {asset.sla_tier !== 'none' ? (
                          <Badge variant="outline" className={cn('text-xs border', slaColors[asset.sla_tier] ?? '')}>
                            {t(`sla_tiers.${asset.sla_tier}`)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{'\u2014'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {asset.environment ? (
                          <span className="text-sm">{t(`environments.${asset.environment}`)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{'\u2014'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {asset.customer?.name ?? '\u2014'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-2">
                <p className="text-sm text-muted-foreground">
                  {t('list.page_info', { page: meta?.page ?? 1, pages: totalPages })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* Topology Graph View */}
      {globalGraphView && (
        <div className="rounded-lg border border-border overflow-hidden" style={{ height: 600 }}>
          {graphLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">{t('topology_loading')}</div>
          ) : globalNodes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">{t('topology_empty')}</div>
          ) : (
            <ReactFlow
              nodes={globalNodes}
              edges={globalEdges}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesDraggable={true}
              nodesConnectable={false}
              elementsSelectable={true}
              onNodeClick={(_, node) => {
                window.location.href = `/assets/${node.id}`;
              }}
            >
              <Controls />
              <MiniMap
                nodeColor={(n) => (n.style?.background as string) ?? '#334155'}
                maskColor="rgba(0,0,0,0.3)"
              />
              <Background color="#334155" gap={20} />
            </ReactFlow>
          )}
        </div>
      )}

    </div>
  );
}
