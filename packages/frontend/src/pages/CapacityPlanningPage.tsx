import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Gauge,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Server,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  useCapacityUtilization,
  useCompatibleHosts,
  useMigrationCheck,
  useOverprovisionedAssets,
  useCapacityTypes,
  type CapacityRequirement,
  type UtilizationOverviewEntry,
} from '@/api/capacity';
import { useAssets } from '@/api/assets';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function utilizationColor(pct: number): string {
  if (pct > 85) return 'text-red-600 dark:text-red-400';
  if (pct > 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function utilizationBarColor(pct: number): string {
  if (pct > 85) return '[&>div]:bg-red-500';
  if (pct > 70) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-green-500';
}

// ---------------------------------------------------------------------------
// Utilization Overview Section
// ---------------------------------------------------------------------------

function UtilizationSection() {
  const { t } = useTranslation('cmdb');
  const { data, isLoading } = useCapacityUtilization();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.assetName.toLowerCase().includes(q) ||
          i.assetType.toLowerCase().includes(q),
      );
    }
    if (filterType !== 'all') {
      items = items.filter((i) => i.assetType === filterType);
    }
    return items;
  }, [data, search, filterType]);

  const assetTypes = useMemo(() => {
    if (!data) return [];
    const types = new Set(data.map((i) => i.assetType));
    return Array.from(types).sort();
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Server className="mb-3 h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">{t('capacity_planning.no_results')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('capacity_planning.asset')}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('capacity_planning.all_types')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('capacity_planning.all_types')}</SelectItem>
            {assetTypes.map((at) => (
              <SelectItem key={at} value={at}>
                {t(`types.${at}`, at)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((entry) => (
          <UtilizationCard key={entry.assetId} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function UtilizationCard({ entry }: { entry: UtilizationOverviewEntry }) {
  const { t } = useTranslation('cmdb');

  return (
    <Link to={`/capacity-planning/${entry.assetId}`} className="block group">
      <Card className="overflow-hidden transition-colors group-hover:border-primary/40">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold truncate group-hover:underline">
              {entry.assetName}
            </span>
            <Badge variant="outline" className="ml-2 shrink-0 text-xs">
              {t(`types.${entry.assetType}`, entry.assetType)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {entry.capacities.map((cap) => (
            <div key={cap.capacityTypeId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {cap.type} ({cap.unit})
                </span>
                <span className={cn('font-semibold', utilizationColor(cap.utilizationPct))}>
                  {cap.utilizationPct.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min(cap.utilizationPct, 100)}
                className={cn('h-2', utilizationBarColor(cap.utilizationPct))}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {t('capacity.allocated')}: {cap.allocated} / {cap.total}
                </span>
                <span>
                  {t('capacity_planning.available')}: {cap.available}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Compatibility Checker Section
// ---------------------------------------------------------------------------

function CompatibilitySection() {
  const { t } = useTranslation('cmdb');
  const { data: capacityTypeList } = useCapacityTypes();
  const [requirements, setRequirements] = useState<CapacityRequirement[]>([]);

  const addRequirement = () => {
    if (!capacityTypeList || capacityTypeList.length === 0) return;
    const firstType = capacityTypeList[0];
    if (!firstType) return;
    setRequirements((prev) => [
      ...prev,
      { capacityTypeId: firstType.id, value: 1 },
    ]);
  };

  const removeRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRequirement = (
    index: number,
    field: 'capacityTypeId' | 'value',
    val: string | number,
  ) => {
    setRequirements((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, [field]: field === 'value' ? Number(val) : val } : r,
      ),
    );
  };

  const { data: hosts, isLoading, isFetching } = useCompatibleHosts(requirements);

  return (
    <div className="space-y-6">
      {/* Requirements form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('capacity_planning.compatibility')}</CardTitle>
          <CardDescription>
            {t('capacity_planning.find_hosts')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requirements.map((req, idx) => (
            <div key={idx} className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-xs">{t('capacity_planning.select_type')}</Label>
                <Select
                  value={req.capacityTypeId}
                  onValueChange={(v) => updateRequirement(idx, 'capacityTypeId', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {capacityTypeList?.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name} ({ct.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label className="text-xs">{t('capacity_planning.value')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={req.value}
                  onChange={(e) => updateRequirement(idx, 'value', e.target.value)}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRequirement(idx)}
                className="shrink-0"
                aria-label={t('capacity_planning.remove_requirement')}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRequirement}>
            <Plus className="mr-2 h-4 w-4" />
            {t('capacity_planning.add_requirement')}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {requirements.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            {isLoading || isFetching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !hosts || hosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <XCircle className="mb-2 h-8 w-8 opacity-40" />
                <p>{t('capacity_planning.no_results')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('capacity_planning.asset')}</TableHead>
                    <TableHead>{t('capacity_planning.type')}</TableHead>
                    {requirements.map((req) => {
                      const ct = capacityTypeList?.find((c) => c.id === req.capacityTypeId);
                      return (
                        <TableHead key={req.capacityTypeId}>
                          {ct?.name ?? req.capacityTypeId}
                        </TableHead>
                      );
                    })}
                    <TableHead className="text-right">{t('capacity_planning.fit_score')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hosts.map((host) => (
                    <TableRow key={host.assetId}>
                      <TableCell>
                        <Link
                          to={`/assets/${host.assetId}`}
                          className="font-medium hover:underline"
                        >
                          {host.assetName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {t(`types.${host.assetType}`, host.assetType)}
                        </Badge>
                      </TableCell>
                      {host.capacities.map((cap) => (
                        <TableCell key={cap.capacityTypeId}>
                          <div className="text-sm">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {cap.available}
                            </span>
                            <span className="text-muted-foreground">
                              {' '}/ {cap.total} {cap.unit}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {t('capacity_planning.remaining')}: {cap.remainingAfter}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">
                        {host.fitScore.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Migration Check Section (inline within Compatibility tab)
// ---------------------------------------------------------------------------

function MigrationCheckSection() {
  const { t } = useTranslation('cmdb');
  const { data: assetList } = useAssets({ limit: 500 });
  const [workloadId, setWorkloadId] = useState('');
  const [targetId, setTargetId] = useState('');

  const { data: result, isLoading } = useMigrationCheck(workloadId, targetId);

  const assetOptions = useMemo(() => {
    if (!assetList) return [];
    const items = 'data' in assetList ? assetList.data : [];
    return items.map((a) => ({ id: a.id, name: a.display_name, type: a.asset_type }));
  }, [assetList]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('capacity_planning.migration_check')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">{t('capacity_planning.workload')}</Label>
            <Select value={workloadId} onValueChange={setWorkloadId}>
              <SelectTrigger>
                <SelectValue placeholder={t('capacity_planning.select_asset')} />
              </SelectTrigger>
              <SelectContent>
                {assetOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{t('capacity_planning.target')}</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder={t('capacity_planning.select_asset')} />
              </SelectTrigger>
              <SelectContent>
                {assetOptions
                  .filter((a) => a.id !== workloadId)
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.feasible ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {t('capacity_planning.feasible')}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {t('capacity_planning.not_feasible')}
                  </span>
                </>
              )}
            </div>

            {result.details.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('capacity_planning.type')}</TableHead>
                    <TableHead>{t('capacity_planning.required')}</TableHead>
                    <TableHead>{t('capacity_planning.available')}</TableHead>
                    <TableHead>{t('capacity_planning.check')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.details.map((d) => (
                    <TableRow key={d.capacityTypeId}>
                      <TableCell className="font-medium">
                        {d.type} ({d.unit})
                      </TableCell>
                      <TableCell>{d.required}</TableCell>
                      <TableCell>{d.available}</TableCell>
                      <TableCell>
                        {d.sufficient ? (
                          <Badge variant="default" className="bg-green-600">
                            {t('capacity_planning.sufficient')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {t('capacity_planning.insufficient')}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Overprovisioned Section
// ---------------------------------------------------------------------------

function OverprovisionedSection() {
  const { t } = useTranslation('cmdb');
  const [threshold, setThreshold] = useState(30);
  const { data, isLoading } = useOverprovisionedAssets(threshold);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">
          {t('capacity_planning.threshold')} (%)
        </Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-24"
        />
      </div>

      {!data || data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <CheckCircle2 className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-lg font-medium">{t('capacity_planning.no_results')}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('capacity_planning.asset')}</TableHead>
              <TableHead>{t('capacity_planning.type')}</TableHead>
              <TableHead>{t('capacity_planning.underutilized')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) =>
              entry.underutilizedCapacities.map((cap, idx) => (
                <TableRow key={`${entry.assetId}-${cap.capacityTypeId}`}>
                  {idx === 0 ? (
                    <>
                      <TableCell rowSpan={entry.underutilizedCapacities.length}>
                        <Link
                          to={`/assets/${entry.assetId}`}
                          className="font-medium hover:underline"
                        >
                          {entry.assetName}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {t(`types.${entry.assetType}`, entry.assetType)}
                        </div>
                      </TableCell>
                    </>
                  ) : null}
                  <TableCell>
                    {cap.type} ({cap.unit})
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                        {cap.utilizationPct.toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({cap.allocated} + {cap.reserved} / {cap.total} {cap.unit})
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CapacityPlanningPage() {
  const { t } = useTranslation('cmdb');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Gauge className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          {t('capacity_planning.title')}
        </h1>
      </div>

      <Tabs defaultValue="utilization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utilization">
            {t('capacity_planning.utilization')}
          </TabsTrigger>
          <TabsTrigger value="compatibility">
            {t('capacity_planning.compatibility')}
          </TabsTrigger>
          <TabsTrigger value="overprovisioned">
            {t('capacity_planning.overprovisioned')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="utilization">
          <UtilizationSection />
        </TabsContent>

        <TabsContent value="compatibility" className="space-y-6">
          <CompatibilitySection />
          <MigrationCheckSection />
        </TabsContent>

        <TabsContent value="overprovisioned">
          <OverprovisionedSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
