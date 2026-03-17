import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ExternalLink,
  Gauge,
  Server,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCapacityConsumers,
  useCapacityUtilization,
  type CapacityUtilizationItem,
} from '@/api/capacity';
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

function statusBadge(pct: number, t: (key: string) => string) {
  if (pct > 85)
    return (
      <Badge variant="destructive" className="text-xs">
        {t('capacity_detail.critical')}
      </Badge>
    );
  if (pct > 70)
    return (
      <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs">
        {t('capacity_detail.warning')}
      </Badge>
    );
  return (
    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 text-xs">
      {t('capacity_detail.healthy')}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Consumer Section per Capacity Type
// ---------------------------------------------------------------------------

function CapacityTypeSection({
  assetId,
  cap,
}: {
  assetId: string;
  cap: CapacityUtilizationItem;
}) {
  const { t } = useTranslation('cmdb');
  const { data: consumers, isLoading } = useCapacityConsumers(
    assetId,
    cap.capacityTypeId,
  );

  const trackedConsumers = useMemo(
    () => consumers?.filter((c) => c.consumed !== null) ?? [],
    [consumers],
  );
  const untrackedConsumers = useMemo(
    () => consumers?.filter((c) => c.consumed === null) ?? [],
    [consumers],
  );
  const totalConsumed = useMemo(
    () => trackedConsumers.reduce((sum, c) => sum + (c.consumed ?? 0), 0),
    [trackedConsumers],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {cap.type}
            <Badge variant="outline" className="text-xs font-normal">
              {cap.unit}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className={cn('text-lg font-bold tabular-nums', utilizationColor(cap.utilizationPct))}>
              {cap.utilizationPct.toFixed(1)}%
            </span>
            {statusBadge(cap.utilizationPct, t)}
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('capacity.allocated')}: {cap.allocated} / {cap.total} {cap.unit}</span>
            <span>{t('capacity_planning.available')}: {cap.available} {cap.unit}</span>
          </div>
          <Progress
            value={Math.min(cap.utilizationPct, 100)}
            className={cn('h-2.5', utilizationBarColor(cap.utilizationPct))}
          />
          {cap.reserved > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('capacity_detail.reserved_note', { amount: cap.reserved, unit: cap.unit })}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !consumers || consumers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Server className="h-8 w-8 opacity-40 mb-2" />
            <p className="text-sm">{t('capacity_planning.no_consumers')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('capacity_planning.asset')}</TableHead>
                  <TableHead>{t('capacity_planning.type')}</TableHead>
                  <TableHead>{t('capacity_planning.relation')}</TableHead>
                  <TableHead className="text-right">
                    {t('capacity.consumes')}
                  </TableHead>
                  <TableHead className="text-right w-[120px]">
                    {t('capacity_detail.share')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackedConsumers
                  .sort((a, b) => (b.consumed ?? 0) - (a.consumed ?? 0))
                  .map((c) => {
                    const share =
                      cap.total > 0
                        ? ((c.consumed ?? 0) / cap.total) * 100
                        : 0;
                    return (
                      <TableRow key={c.assetId}>
                        <TableCell>
                          <Link
                            to={`/assets/${c.assetId}`}
                            className="inline-flex items-center gap-1.5 font-medium hover:underline"
                          >
                            {c.assetName}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {t(`types.${c.assetType}`, c.assetType)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {c.relationType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {c.consumed} {cap.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress
                              value={Math.min(share, 100)}
                              className={cn(
                                'h-1.5 w-12',
                                utilizationBarColor(share),
                              )}
                            />
                            <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                              {share.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {untrackedConsumers.map((c) => (
                  <TableRow key={c.assetId} className="opacity-60">
                    <TableCell>
                      <Link
                        to={`/assets/${c.assetId}`}
                        className="inline-flex items-center gap-1.5 font-medium hover:underline"
                      >
                        {c.assetName}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {t(`types.${c.assetType}`, c.assetType)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {c.relationType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className="text-xs text-muted-foreground"
                      >
                        {t('capacity_planning.untracked')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      —
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Summary footer */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t('capacity_planning.tracked_consumption')}
                </span>
                <span className="font-semibold tabular-nums">
                  {totalConsumed} / {cap.total} {cap.unit}
                </span>
              </div>
              <Progress
                value={
                  cap.total > 0
                    ? Math.min((totalConsumed / cap.total) * 100, 100)
                    : 0
                }
                className={cn(
                  'h-2',
                  utilizationBarColor(
                    cap.total > 0 ? (totalConsumed / cap.total) * 100 : 0,
                  ),
                )}
              />
              {totalConsumed < cap.allocated && (
                <p className="text-[11px] text-muted-foreground">
                  {t('capacity_planning.untracked_consumption', {
                    amount: (cap.allocated - totalConsumed).toFixed(0),
                    unit: cap.unit,
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CapacityDetailPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const { t } = useTranslation('cmdb');

  const { data: allUtilization, isLoading } = useCapacityUtilization();

  const assetEntry = useMemo(
    () => allUtilization?.find((e) => e.assetId === assetId),
    [allUtilization, assetId],
  );

  const assetName = assetEntry?.assetName ?? '...';
  const assetType = assetEntry?.assetType ?? '';
  const capacities = assetEntry?.capacities ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/capacity-planning">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Gauge className="h-6 w-6 text-primary" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {assetName}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              to={`/assets/${assetId}`}
              className="hover:underline inline-flex items-center gap-1"
            >
              {t('capacity_detail.view_asset')}
              <ExternalLink className="h-3 w-3" />
            </Link>
            {assetType && (
              <>
                <span>·</span>
                <span>{t(`types.${assetType}`, assetType)}</span>
              </>
            )}
            {capacities.length > 0 && (
              <>
                <span>·</span>
                <span>
                  {capacities.length} {t('capacity_detail.capacity_types_count')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : capacities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Server className="h-12 w-12 opacity-40 mb-3" />
          <p className="text-lg font-medium">{t('capacity_planning.no_results')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {capacities.map((cap) => (
            <CapacityTypeSection
              key={cap.capacityTypeId}
              assetId={assetId!}
              cap={cap}
            />
          ))}
        </div>
      )}
    </div>
  );
}
