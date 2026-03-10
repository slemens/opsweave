import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCabPending, useCabAll, useCabDecision, type CabItem } from '@/api/tickets';
import { formatRelativeTime, formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Risk Level Badge
// ---------------------------------------------------------------------------

function RiskBadge({ level }: { level: string | null }) {
  const { t } = useTranslation('tickets');
  if (!level) return <span className="text-xs text-muted-foreground">—</span>;
  const variantMap: Record<string, 'secondary' | 'warning' | 'destructive' | 'outline'> = {
    low: 'secondary',
    medium: 'outline',
    high: 'warning',
    critical: 'destructive',
  };
  return <Badge variant={variantMap[level] ?? 'outline'}>{t(`rfc.risk_levels.${level}`)}</Badge>;
}

function DecisionBadge({ decision }: { decision: string | null }) {
  const { t } = useTranslation('tickets');
  if (!decision) return <Badge variant="warning">{t('cab.pending')}</Badge>;
  const map: Record<string, { variant: 'success' | 'destructive' | 'warning'; icon: React.ReactNode }> = {
    approved: { variant: 'success', icon: <CheckCircle2 className="mr-1 h-3 w-3" /> },
    rejected: { variant: 'destructive', icon: <XCircle className="mr-1 h-3 w-3" /> },
    deferred: { variant: 'warning', icon: <PauseCircle className="mr-1 h-3 w-3" /> },
  };
  const entry = map[decision] ?? { variant: 'warning' as const, icon: null };
  return (
    <Badge variant={entry.variant} className="inline-flex items-center">
      {entry.icon}
      {t(`cab.decision_${decision}`)}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Decision Dialog
// ---------------------------------------------------------------------------

interface DecisionDialogProps {
  item: CabItem | null;
  onClose: () => void;
}

function DecisionDialog({ item, onClose }: DecisionDialogProps) {
  const { t } = useTranslation('tickets');
  const [notes, setNotes] = useState('');
  const cabDecision = useCabDecision();

  if (!item) return null;

  const handleDecision = async (decision: string) => {
    await cabDecision.mutateAsync({ ticketId: item.id, decision, notes: notes.trim() || undefined });
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('cab.decision_title')}</DialogTitle>
          <DialogDescription>
            {item.ticket_number} — {item.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('cab.risk')}:</span>{' '}
              <RiskBadge level={item.change_risk_level} />
            </div>
            <div>
              <span className="text-muted-foreground">{t('cab.planned_start')}:</span>{' '}
              {item.change_planned_start ? formatDate(item.change_planned_start) : '—'}
            </div>
          </div>

          <Textarea
            placeholder={t('cab.notes_placeholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleDecision('deferred')}
            disabled={cabDecision.isPending}
          >
            <PauseCircle className="mr-1.5 h-4 w-4" />
            {t('cab.defer')}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleDecision('rejected')}
            disabled={cabDecision.isPending}
          >
            {cabDecision.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
            {t('cab.reject')}
          </Button>
          <Button
            size="sm"
            onClick={() => void handleDecision('approved')}
            disabled={cabDecision.isPending}
          >
            {cabDecision.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
            {t('cab.approve')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// CAB Table
// ---------------------------------------------------------------------------

function CabTable({ items, showDecision, onDecide }: { items: CabItem[]; showDecision?: boolean; onDecide?: (item: CabItem) => void }) {
  const { t } = useTranslation('tickets');

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
        <ShieldCheck className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t('cab.empty')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-32 font-semibold">{t('cab.col_number')}</TableHead>
            <TableHead className="font-semibold">{t('cab.col_title')}</TableHead>
            <TableHead className="w-24 font-semibold">{t('cab.col_risk')}</TableHead>
            <TableHead className="w-36 font-semibold">{t('cab.col_planned')}</TableHead>
            <TableHead className="w-28 font-semibold">{t('cab.col_reporter')}</TableHead>
            {showDecision && <TableHead className="w-28 font-semibold">{t('cab.col_decision')}</TableHead>}
            {onDecide && <TableHead className="w-28" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  to={`/tickets/${item.id}`}
                  className="font-mono text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.ticket_number}
                </Link>
              </TableCell>
              <TableCell className="max-w-xs">
                <span className="line-clamp-1 font-medium">{item.title}</span>
              </TableCell>
              <TableCell>
                <RiskBadge level={item.change_risk_level} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.change_planned_start
                  ? formatRelativeTime(item.change_planned_start)
                  : '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.reporter_name ?? '—'}
              </TableCell>
              {showDecision && (
                <TableCell>
                  <DecisionBadge decision={item.cab_decision} />
                </TableCell>
              )}
              {onDecide && (
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => onDecide(item)}>
                    {t('cab.decide')}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CabBoardPage() {
  const { t } = useTranslation('tickets');
  const { data: pending, isLoading: pendingLoading, error: pendingError, refetch: refetchPending } = useCabPending();
  const { data: all, isLoading: allLoading } = useCabAll();
  const [decidingItem, setDecidingItem] = useState<CabItem | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('cab.title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('cab.subtitle')}</p>
        </div>
        {pending && pending.length > 0 && (
          <Badge variant="warning" className="text-sm px-3 py-1">
            {t('cab.pending_count', { count: pending.length })}
          </Badge>
        )}
      </div>

      {pendingError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="flex-1 text-sm text-destructive">{t('cab.error')}</p>
            <Button variant="outline" size="sm" onClick={() => void refetchPending()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-4 w-4" />
            {t('cab.tab_pending')}
            {pending && pending.length > 0 && (
              <Badge variant="warning" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            {t('cab.tab_all')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <CabTable items={pending ?? []} onDecide={setDecidingItem} />
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {allLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <CabTable items={all ?? []} showDecision />
          )}
        </TabsContent>
      </Tabs>

      <DecisionDialog item={decidingItem} onClose={() => setDecidingItem(null)} />
    </div>
  );
}
