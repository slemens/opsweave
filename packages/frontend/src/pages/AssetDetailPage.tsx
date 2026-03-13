import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Trash2,
  Link2,
  Plus,
  ExternalLink,
  List,
  GitGraph,
  Shield,
  Activity,
  Calendar,
  Eye,
} from 'lucide-react';
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  type Node as RFNode,
  type Edge as RFEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { applyDagreLayout } from '@/lib/graph-layout';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn, formatDate } from '@/lib/utils';
import {
  useAsset,
  useAssetRelations,
  useAssetTickets,
  useUpdateAsset,
  useDeleteAsset,
  useCreateAssetRelation,
  useDeleteAssetRelation,
  useAssets,
  useAssetGraph,
} from '@/api/assets';
// AUDIT-FIX: M-09 — Import from domain-specific API modules
import { useGroups } from '@/api/groups';
import { useCustomers } from '@/api/customers';
import type { AssetRelationWithDetails, AssetTicketSummary } from '@/api/assets';
import {
  useClassificationModels,
  useAssetClassifications,
  useClassifyAsset,
  useRemoveAssetClassification,
} from '@/api/classifications';
import {
  useAssetCapacityUtilization,
} from '@/api/capacity';
import { ASSET_STATUSES, SLA_TIERS, ENVIRONMENTS } from '@opsweave/shared';
import { useAssetTypes, useRelationTypes } from '@/api/asset-types';
import { DynamicFieldDisplay } from '@/components/cmdb/DynamicFieldDisplay';
import { DynamicFormRenderer } from '@/components/cmdb/DynamicFormRenderer';
import { getLocalizedLabel } from '@/lib/attribute-schema';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  decommissioned: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const _slaColors: Record<string, string> = {
  platinum: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  gold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  silver: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  bronze: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  none: 'bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400',
};

const ticketStatusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
};

import { ASSET_TYPE_CATEGORIES } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('cmdb');
  const { t: tCommon } = useTranslation('common');
  const { t: tTickets } = useTranslation('tickets');

  // ── Asset & Relation Types from API ──────────────────────
  const { data: assetTypesData } = useAssetTypes();
  const { data: relationTypesData } = useRelationTypes();

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

  const typeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const at of assetTypesData ?? []) map.set(at.slug, at.name);
    return map;
  }, [assetTypesData]);

  const relTypeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const rt of relationTypesData ?? []) map.set(rt.slug, rt.name);
    return map;
  }, [relationTypesData]);

  const getTypeName = useCallback((slug: string) => {
    const i18nKey = `types.${slug}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
    return typeNameMap.get(slug) ?? slug;
  }, [t, typeNameMap]);

  const getRelTypeName = useCallback((slug: string) => {
    const i18nKey = `relations.${slug}`;
    const translated = t(i18nKey);
    if (translated !== i18nKey) return translated;
    return relTypeNameMap.get(slug) ?? slug;
  }, [t, relTypeNameMap]);

  const relTypeSchemaMap = useMemo(() => {
    const map = new Map<string, import('@opsweave/shared').AttributeDefinition[]>();
    for (const rt of relationTypesData ?? []) {
      if (rt.properties_schema?.length > 0) map.set(rt.slug, rt.properties_schema);
    }
    return map;
  }, [relationTypesData]);

  // ── Temporal filter state ────────────────────────────────
  const [viewContext, setViewContext] = useState<'all' | 'operations' | 'security' | 'compliance' | 'architecture'>('all');
  const [temporalAsOf, setTemporalAsOf] = useState<string>('');
  const [temporalShowAll, setTemporalShowAll] = useState(false);

  // ── Data ──────────────────────────────────────────────────
  const { data: asset, isLoading, isError, refetch } = useAsset(id ?? '');
  const relationsOptions = temporalShowAll ? undefined : temporalAsOf ? { as_of: temporalAsOf } : undefined;
  const { data: relations } = useAssetRelations(id ?? '', relationsOptions);
  const { data: linkedTickets } = useAssetTickets(id ?? '');
  const { data: graphData } = useAssetGraph(id ?? '');
  const { data: groupsData } = useGroups();
  const { data: customersData } = useCustomers();

  // ── Classifications & Capacity ─────────────────────────────
  const { data: classificationModels } = useClassificationModels();
  const { data: assetClassifications } = useAssetClassifications(id ?? '');
  const { data: capacityUtilization } = useAssetCapacityUtilization(id ?? '');
  const classifyAsset = useClassifyAsset();
  const removeClassification = useRemoveAssetClassification();

  const updateAsset = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const createRelation = useCreateAssetRelation();
  const deleteRelation = useDeleteAssetRelation();

  // For relation dialog — need all assets to pick from
  const { data: allAssetsData } = useAssets({ limit: 100 });

  // ── Graph View Toggle ─────────────────────────────────────
  const [graphView, setGraphView] = useState(false);

  // ── Relation Dialog ───────────────────────────────────────
  const [relationOpen, setRelationOpen] = useState(false);
  const [relTarget, setRelTarget] = useState('');
  const [relType, setRelType] = useState<string>('depends_on');
  const [relDirection, setRelDirection] = useState<'outgoing' | 'incoming'>('outgoing');
  const [relProperties, setRelProperties] = useState<Record<string, unknown>>({});

  // ── Classification Dialog ──────────────────────────────────
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedValueId, setSelectedValueId] = useState('');
  const [justification, setJustification] = useState('');

  const selectedModelValues = useMemo(() => {
    if (!selectedModelId || !classificationModels) return [];
    const model = classificationModels.find((m) => m.id === selectedModelId);
    return model?.values ?? [];
  }, [selectedModelId, classificationModels]);

  const otherAssets = useMemo(() => {
    const all = allAssetsData?.data ?? [];
    return all.filter((a) => a.id !== id);
  }, [allAssetsData, id]);

  // ── Graph Layout (dagre) ───────────────────────────────────
  const { rfNodes, rfEdges } = useMemo(() => {
    if (!graphData?.nodes?.length) return { rfNodes: [], rfEdges: [] };

    const rawNodes: RFNode[] = graphData.nodes.map((n) => ({
      id: n.id,
      data: {
        label: (
          <div style={{ textAlign: 'center', fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>{n.display_name || n.name}</div>
            <div style={{ opacity: 0.7, fontSize: 11 }}>{n.asset_type}</div>
          </div>
        ),
      },
      position: { x: 0, y: 0 },
      style: {
        background: n.id === graphData.centerAssetId ? '#2563eb' : '#1e293b',
        color: '#fff',
        border: n.id === graphData.centerAssetId ? '2px solid #3b82f6' : '1px solid #334155',
        borderRadius: 8,
        width: 160,
        fontSize: 12,
        padding: '8px 12px',
      },
    }));

    const rawEdges: RFEdge[] = graphData.edges.map((e) => ({
      id: e.id,
      source: e.source_asset_id,
      target: e.target_asset_id,
      label: e.relation_type,
      labelStyle: { fontSize: 10, fill: '#94a3b8' },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.8 },
      style: { stroke: '#475569' },
      type: 'smoothstep' as const,
      animated: false,
    }));

    const layout = applyDagreLayout(rawNodes, rawEdges, 'TB');
    return { rfNodes: layout.nodes, rfEdges: layout.edges };
  }, [graphData]);

  // ── Handlers ──────────────────────────────────────────────

  const handleFieldChange = useCallback(async (field: string, value: string | null) => {
    if (!id) return;
    try {
      await updateAsset.mutateAsync({ id, [field]: value });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateAsset, t]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!window.confirm(t('delete_confirm'))) return;
    try {
      await deleteAssetMutation.mutateAsync(id);
      toast.success(t('delete_success'));
      navigate('/assets');
    } catch {
      toast.error(t('delete_error'));
    }
  }, [id, deleteAssetMutation, t, navigate]);

  const handleAddRelation = useCallback(async () => {
    if (!id || !relTarget || !relType) return;
    const hasProps = Object.keys(relProperties).length > 0;
    const payload = relDirection === 'outgoing'
      ? { assetId: id, source_asset_id: id, target_asset_id: relTarget, relation_type: relType, ...(hasProps ? { properties: relProperties } : {}) }
      : { assetId: id, source_asset_id: relTarget, target_asset_id: id, relation_type: relType, ...(hasProps ? { properties: relProperties } : {}) };

    try {
      await createRelation.mutateAsync(payload);
      toast.success(t('relations.add_success'));
      setRelationOpen(false);
      setRelTarget('');
      setRelType('depends_on');
      setRelProperties({});
    } catch {
      toast.error(t('relations.add_error'));
    }
  }, [id, relTarget, relType, relDirection, relProperties, createRelation, t]);

  const handleDeleteRelation = useCallback(async (relationId: string) => {
    if (!id) return;
    try {
      await deleteRelation.mutateAsync({ assetId: id, relationId });
      toast.success(t('relations.delete_success'));
    } catch {
      toast.error(t('relations.delete_error'));
    }
  }, [id, deleteRelation, t]);

  const handleAddClassification = useCallback(async () => {
    if (!id || !selectedValueId) return;
    try {
      await classifyAsset.mutateAsync({
        assetId: id,
        value_id: selectedValueId,
        justification: justification || undefined,
      });
      toast.success(t('classifications.add_success'));
      setClassificationOpen(false);
      setSelectedModelId('');
      setSelectedValueId('');
      setJustification('');
    } catch {
      toast.error(t('classifications.add_error'));
    }
  }, [id, selectedValueId, justification, classifyAsset, t]);

  const handleRemoveClassification = useCallback(async (valueId: string) => {
    if (!id) return;
    try {
      await removeClassification.mutateAsync({ assetId: id, valueId });
      toast.success(t('classifications.remove_success'));
    } catch {
      toast.error(t('classifications.remove_error'));
    }
  }, [id, removeClassification, t]);

  // ── Group / Customer Options ──────────────────────────────

  const groups = useMemo(() => groupsData?.data ?? [], [groupsData]);
  const customers = useMemo(() => customersData?.data ?? [], [customersData]);

  // ── Loading / Error ───────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium mb-1">{tCommon('status.error')}</p>
        <p className="text-sm text-muted-foreground mb-4">{tCommon('errors.generic')}</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {tCommon('actions.retry')}
        </Button>
      </div>
    );
  }

  const relationsData = (relations ?? []) as AssetRelationWithDetails[];
  const ticketsData = (linkedTickets ?? []) as AssetTicketSummary[];
  const classificationsData = assetClassifications ?? [];
  const capacityData = capacityUtilization?.capacities ?? [];
  const providesCapacity = capacityData.filter((c) => c.direction === 'provides');
  const requiresCapacity = capacityData.filter((c) => c.direction === 'requires');

  return (
    <div className="space-y-6" data-testid="page-asset-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/assets')} data-testid="btn-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{asset.display_name}</h2>
            <p className="text-sm text-muted-foreground font-mono">{asset.name}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="text-destructive" onClick={handleDelete} data-testid="btn-delete-asset">
          <Trash2 className="mr-2 h-4 w-4" />
          {tCommon('actions.delete')}
        </Button>
      </div>

      {/* Context View Switcher */}
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">{t('context_view.label')}</span>
        <div className="flex rounded-lg border bg-muted p-0.5 gap-0.5">
          {(['all', 'operations', 'security', 'compliance', 'architecture'] as const).map((ctx) => (
            <button
              key={ctx}
              onClick={() => setViewContext(ctx)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewContext === ctx
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(`context_view.${ctx}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details" data-testid="tab-details">{t('tabs.details')}</TabsTrigger>
              {(viewContext === 'all' || viewContext === 'operations' || viewContext === 'architecture') && (
                <TabsTrigger value="relations" data-testid="tab-relations">
                  {t('tabs.relations')}
                  {relationsData.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {relationsData.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {(viewContext === 'all' || viewContext === 'operations') && (
                <TabsTrigger value="tickets" data-testid="tab-tickets">
                  {t('tabs.tickets')}
                  {ticketsData.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {ticketsData.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {(viewContext === 'all' || viewContext === 'security' || viewContext === 'compliance') && (
                <TabsTrigger value="classifications" data-testid="tab-classifications">
                  {t('tabs.classifications')}
                  {classificationsData.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {classificationsData.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
              {(viewContext === 'all' || viewContext === 'operations' || viewContext === 'architecture') && (
                <TabsTrigger value="capacity" data-testid="tab-capacity">
                  {t('tabs.capacity')}
                  {capacityData.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {capacityData.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('fields.display_name')}</Label>
                      <p className="text-sm font-medium mt-1">{asset.display_name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('fields.name')}</Label>
                      <p className="text-sm font-mono mt-1">{asset.name}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('fields.asset_type')}</Label>
                      <div className="text-sm mt-1">
                        <Badge variant="outline">{getTypeName(asset.asset_type)}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('fields.ip_address')}</Label>
                      <p className="text-sm font-mono mt-1">{asset.ip_address ?? '\u2014'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('fields.location')}</Label>
                      <p className="text-sm mt-1">{asset.location ?? '\u2014'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('fields.owner_group')}</Label>
                      <p className="text-sm mt-1">{asset.owner_group?.name ?? '\u2014'}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('fields.created_at')}</Label>
                      <p className="text-sm text-muted-foreground mt-1">{formatDate(asset.created_at)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('fields.updated_at')}</Label>
                      <p className="text-sm text-muted-foreground mt-1">{formatDate(asset.updated_at)}</p>
                    </div>
                  </div>
                  {/* Dynamic type-specific attributes (Evo-3E) */}
                  {(() => {
                    const currentType = (assetTypesData ?? []).find((at) => at.slug === asset.asset_type);
                    const attrSchema = currentType?.attribute_schema ?? [];
                    if (attrSchema.length === 0) return null;
                    const attrValues = (asset as unknown as Record<string, unknown>).attributes as Record<string, unknown> | undefined;
                    return (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            {t('dynamic_fields.attributes')}
                          </p>
                          <DynamicFieldDisplay
                            schema={attrSchema}
                            values={attrValues ?? {}}
                          />
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Relations Tab */}
            <TabsContent value="relations" className="mt-4">
              <Card>
                <CardHeader className="flex flex-col gap-3 pb-3">
                  <div className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">{t('relations.title')}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={graphView ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => setGraphView(false)}
                      >
                        <List className="h-4 w-4 mr-1" />
                        {t('relations.table_view')}
                      </Button>
                      <Button
                        variant={graphView ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setGraphView(true)}
                      >
                        <GitGraph className="h-4 w-4 mr-1" />
                        {t('relations.graph_view')}
                      </Button>
                      <Button size="sm" onClick={() => setRelationOpen(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        {t('relations.add')}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">{t('temporal.as_of')}</Label>
                      <Input
                        type="date"
                        value={temporalAsOf}
                        onChange={(e) => setTemporalAsOf(e.target.value)}
                        disabled={temporalShowAll}
                        className="h-8 w-40 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={temporalShowAll}
                        onCheckedChange={(checked) => setTemporalShowAll(checked === true)}
                      />
                      <Label className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                        {t('temporal.show_all')}
                      </Label>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {graphView ? (
                    rfNodes.length > 0 ? (
                      <div style={{ height: 400 }} className="border rounded-lg overflow-hidden" data-testid="relation-graph">
                        <ReactFlow
                          nodes={rfNodes}
                          edges={rfEdges}
                          fitView
                          fitViewOptions={{ padding: 0.25 }}
                          nodesDraggable={true}
                          nodesConnectable={false}
                          elementsSelectable={true}
                        >
                          <Controls />
                          <MiniMap
                            nodeColor={(n) => (n.style?.background as string) ?? '#1e293b'}
                            maskColor="rgba(0,0,0,0.3)"
                          />
                          <Background color="#334155" gap={20} />
                        </ReactFlow>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <GitGraph className="h-8 w-8 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">{t('relations.no_relations')}</p>
                      </div>
                    )
                  ) : relationsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Link2 className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">{t('relations.no_relations')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('relations.source')}</TableHead>
                          <TableHead>{t('relations.type')}</TableHead>
                          <TableHead>{t('relations.target')}</TableHead>
                          <TableHead>{t('relations.properties')}</TableHead>
                          <TableHead className="w-[60px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {relationsData.map((rel) => (
                          <TableRow key={rel.id}>
                            <TableCell className="text-sm">
                              {rel.direction === 'outgoing' ? (
                                <span className="font-medium">{asset.display_name}</span>
                              ) : (
                                <Link
                                  to={`/assets/${rel.related_asset.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {rel.related_asset.display_name}
                                </Link>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getRelTypeName(rel.relation_type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {rel.direction === 'outgoing' ? (
                                <Link
                                  to={`/assets/${rel.related_asset.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {rel.related_asset.display_name}
                                </Link>
                              ) : (
                                <span className="font-medium">{asset.display_name}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <RelationPropertiesCell
                                properties={rel.properties}
                                schema={relTypeSchemaMap.get(rel.relation_type)}
                                locale={i18n.language}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteRelation(rel.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('linked_tickets.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {ticketsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <ExternalLink className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">{t('linked_tickets.no_tickets')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tTickets('fields.ticket_number')}</TableHead>
                          <TableHead>{tTickets('fields.title')}</TableHead>
                          <TableHead>{tTickets('fields.status')}</TableHead>
                          <TableHead>{tTickets('fields.type')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ticketsData.map((ticket) => (
                          <TableRow
                            key={ticket.id}
                            className="cursor-pointer"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                          >
                            <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                            <TableCell className="text-sm">{ticket.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-xs', ticketStatusColors[ticket.status] ?? '')}>
                                {tTickets(`statuses.${ticket.status}`)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {tTickets(`types.${ticket.ticket_type}`)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Classifications Tab */}
            <TabsContent value="classifications" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">{t('classifications.title')}</CardTitle>
                  <Button size="sm" onClick={() => setClassificationOpen(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t('classifications.add')}
                  </Button>
                </CardHeader>
                <CardContent>
                  {classificationsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Shield className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">{t('classifications.no_classifications')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('classifications.model')}</TableHead>
                          <TableHead>{t('classifications.value')}</TableHead>
                          <TableHead>{t('classifications.justification')}</TableHead>
                          <TableHead>{t('classifications.classified_by')}</TableHead>
                          <TableHead>{t('classifications.classified_at')}</TableHead>
                          <TableHead className="w-[60px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classificationsData.map((cls) => (
                          <TableRow key={cls.id}>
                            <TableCell className="text-sm font-medium">
                              {cls.value?.model?.name ?? '\u2014'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={cls.value?.color ? { borderColor: cls.value.color, color: cls.value.color } : undefined}
                              >
                                {cls.value?.label ?? cls.value_id}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {cls.justification ?? '\u2014'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {cls.classified_by_name ?? '\u2014'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(cls.classified_at)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveClassification(cls.value_id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Capacity Tab */}
            <TabsContent value="capacity" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('capacity.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {capacityData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Activity className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">{t('capacity.no_capacity')}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {providesCapacity.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            {t('capacity.provides')}
                          </p>
                          <div className="space-y-4">
                            {providesCapacity.map((cap, idx) => {
                              const pct = cap.utilization_pct;
                              const variant = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'success';
                              return (
                                <div key={`provides-${idx}`} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">
                                      {cap.capacity_type.name}
                                      <span className="text-muted-foreground ml-1 text-xs">({cap.capacity_type.unit})</span>
                                    </span>
                                    <span className={cn(
                                      'text-xs font-medium',
                                      pct > 90 ? 'text-destructive' : pct > 70 ? 'text-warning' : 'text-emerald-600 dark:text-emerald-400',
                                    )}>
                                      {pct.toFixed(1)}%
                                    </span>
                                  </div>
                                  <Progress value={pct} variant={variant} height={6} />
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{t('capacity.allocated')}: {cap.allocated}</span>
                                    <span>{t('capacity.reserved')}: {cap.reserved}</span>
                                    <span>{t('capacity.available')}: {cap.available}</span>
                                    <span>{t('capacity.total')}: {cap.total}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {requiresCapacity.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            {t('capacity.requires')}
                          </p>
                          <div className="space-y-4">
                            {requiresCapacity.map((cap, idx) => {
                              const pct = cap.utilization_pct;
                              const variant = pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'success';
                              return (
                                <div key={`requires-${idx}`} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">
                                      {cap.capacity_type.name}
                                      <span className="text-muted-foreground ml-1 text-xs">({cap.capacity_type.unit})</span>
                                    </span>
                                    <span className={cn(
                                      'text-xs font-medium',
                                      pct > 90 ? 'text-destructive' : pct > 70 ? 'text-warning' : 'text-emerald-600 dark:text-emerald-400',
                                    )}>
                                      {pct.toFixed(1)}%
                                    </span>
                                  </div>
                                  <Progress value={pct} variant={variant} height={6} />
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{t('capacity.allocated')}: {cap.allocated}</span>
                                    <span>{t('capacity.reserved')}: {cap.reserved}</span>
                                    <span>{t('capacity.available')}: {cap.available}</span>
                                    <span>{t('capacity.total')}: {cap.total}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fields.status')}</Label>
                <Select
                  value={asset.status}
                  onValueChange={(v) => handleFieldChange('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', statusColors[s]?.split(' ')[0] ?? '')} />
                          {t(`statuses.${s}`)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fields.asset_type')}</Label>
                <Select
                  value={asset.asset_type}
                  onValueChange={(v) => handleFieldChange('asset_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypeGroups.map((group) => (
                      <SelectGroup key={group.category}>
                        <SelectLabel>{t(`type_categories.${group.category}`)}</SelectLabel>
                        {group.types.map((at) => (
                          <SelectItem key={at} value={at}>{getTypeName(at)}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fields.sla_tier')}</Label>
                <Select
                  value={asset.sla_tier}
                  onValueChange={(v) => handleFieldChange('sla_tier', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLA_TIERS.map((s) => (
                      <SelectItem key={s} value={s}>{t(`sla_tiers.${s}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fields.environment')}</Label>
                <Select
                  value={asset.environment ?? '__none__'}
                  onValueChange={(v) => handleFieldChange('environment', v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{'\u2014'}</SelectItem>
                    {ENVIRONMENTS.map((e) => (
                      <SelectItem key={e} value={e}>{t(`environments.${e}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fields.owner_group')}</Label>
                <Select
                  value={asset.owner_group_id ?? '__none__'}
                  onValueChange={(v) => handleFieldChange('owner_group_id', v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{'\u2014'}</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fields.customer')}</Label>
                <Select
                  value={asset.customer_id ?? '__none__'}
                  onValueChange={(v) => handleFieldChange('customer_id', v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{'\u2014'}</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fields.ip_address')}</Label>
                <p className="text-sm font-mono">{asset.ip_address ?? '\u2014'}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">{t('fields.location')}</Label>
                <p className="text-sm">{asset.location ?? '\u2014'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Relation Dialog */}
      <Dialog open={relationOpen} onOpenChange={setRelationOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{t('relations.add')}</DialogTitle>
            <DialogDescription>
              {asset.display_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Richtung</Label>
              <Select value={relDirection} onValueChange={(v) => setRelDirection(v as 'outgoing' | 'incoming')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outgoing">{asset.display_name} \u2192 ...</SelectItem>
                  <SelectItem value="incoming">... \u2192 {asset.display_name}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('relations.type')}</Label>
              <Select value={relType} onValueChange={(v) => { setRelType(v); setRelProperties({}); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(relationTypesData ?? []).map((rt) => (
                    <SelectItem key={rt.slug} value={rt.slug}>
                      {getRelTypeName(rt.slug)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('relations.select_asset')}</Label>
              <Select value={relTarget} onValueChange={setRelTarget}>
                <SelectTrigger>
                  <SelectValue placeholder={t('relations.select_asset')} />
                </SelectTrigger>
                <SelectContent>
                  {otherAssets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.display_name}
                      <span className="text-muted-foreground ml-2 text-xs">({getTypeName(a.asset_type)})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {relTypeSchemaMap.has(relType) && (
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">{t('relations.properties')}</Label>
                <div className="rounded-md border p-3">
                  <DynamicFormRenderer
                    schema={relTypeSchemaMap.get(relType)!}
                    values={relProperties}
                    onChange={setRelProperties}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRelationOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              onClick={handleAddRelation}
              disabled={!relTarget || createRelation.isPending}
            >
              {createRelation.isPending ? tCommon('status.loading') : t('relations.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Classification Dialog */}
      <Dialog open={classificationOpen} onOpenChange={setClassificationOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{t('classifications.add')}</DialogTitle>
            <DialogDescription>
              {asset.display_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('classifications.model')}</Label>
              <Select
                value={selectedModelId}
                onValueChange={(v) => {
                  setSelectedModelId(v);
                  setSelectedValueId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('classifications.select_model')} />
                </SelectTrigger>
                <SelectContent>
                  {(classificationModels ?? []).map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('classifications.value')}</Label>
              <Select
                value={selectedValueId}
                onValueChange={setSelectedValueId}
                disabled={!selectedModelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('classifications.select_value')} />
                </SelectTrigger>
                <SelectContent>
                  {selectedModelValues.map((val) => (
                    <SelectItem key={val.id} value={val.id}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t('classifications.justification')}</Label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={t('classifications.justification')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setClassificationOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              onClick={handleAddClassification}
              disabled={!selectedValueId || classifyAsset.isPending}
            >
              {classifyAsset.isPending ? tCommon('status.loading') : t('classifications.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relation Properties Cell — shows edge metadata as tooltip
// ---------------------------------------------------------------------------

function RelationPropertiesCell({
  properties,
  schema,
  locale,
}: {
  properties: Record<string, unknown>;
  schema?: import('@opsweave/shared').AttributeDefinition[];
  locale: string;
}) {
  const entries = Object.entries(properties).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return <span className="text-muted-foreground text-xs">{'\u2014'}</span>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1">
          <Info className="h-3 w-3" />
          {entries.length}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1 text-xs">
          {entries.map(([key, value]) => {
            const def = schema?.find((d) => d.key === key);
            const label = def ? getLocalizedLabel(def.label, locale) : key;
            return (
              <div key={key} className="flex gap-2">
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            );
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
