import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Ticket as TicketIcon,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { portalApi } from '@/api/portal';
import type { PortalTicket, CreatePortalTicketPayload } from '@/api/portal';
import { formatDate, formatRelativeTime } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status & Priority helpers
// ---------------------------------------------------------------------------

type TicketStatus = PortalTicket['status'];
type TicketPriority = PortalTicket['priority'];

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  pending: 'Ausstehend',
  resolved: 'Gelöst',
  closed: 'Geschlossen',
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  critical: 'Kritisch',
};

function StatusBadge({ status }: { status: TicketStatus }) {
  const variantMap: Record<TicketStatus, 'default' | 'warning' | 'secondary' | 'success' | 'outline'> = {
    open: 'default',
    in_progress: 'warning',
    pending: 'secondary',
    resolved: 'success',
    closed: 'outline',
  };
  return (
    <Badge variant={variantMap[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const variantMap: Record<TicketPriority, 'secondary' | 'warning' | 'destructive' | 'outline'> = {
    low: 'secondary',
    medium: 'outline',
    high: 'warning',
    critical: 'destructive',
  };
  return (
    <Badge variant={variantMap[priority]}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Create Ticket Dialog
// ---------------------------------------------------------------------------

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (ticket: PortalTicket) => void;
}

function CreateTicketDialog({ open, onOpenChange, onCreated }: CreateTicketDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketType, setTicketType] = useState<'incident' | 'change'>('incident');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form state when dialog closes
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle('');
      setDescription('');
      setTicketType('incident');
      setPriority('medium');
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const payload: CreatePortalTicketPayload = {
        title: title.trim(),
        description: description.trim(),
        ticketType,
        priority,
      };
      const ticket = await portalApi.createTicket(payload);
      onCreated(ticket);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ticket konnte nicht erstellt werden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Neues Ticket erstellen</DialogTitle>
          <DialogDescription>
            Beschreiben Sie Ihr Anliegen. Unser Support-Team wird es so schnell wie möglich bearbeiten.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ct-title">
              Titel <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ct-title"
              placeholder="Kurze Beschreibung des Problems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ct-description">Beschreibung</Label>
            <Textarea
              id="ct-description"
              placeholder="Detaillierte Beschreibung, Fehlermeldungen, betroffene Systeme…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ct-type">Ticket-Typ</Label>
              <Select
                value={ticketType}
                onValueChange={(v) => setTicketType(v as 'incident' | 'change')}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ct-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident">Störung / Incident</SelectItem>
                  <SelectItem value="change">Änderungsanfrage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-priority">Priorität</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TicketPriority)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ct-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird erstellt…
                </>
              ) : (
                'Ticket erstellen'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TicketsTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-md border border-border px-4 py-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <TicketIcon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">Keine Tickets vorhanden</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">
        Sie haben noch keine Support-Anfragen gestellt. Erstellen Sie Ihr erstes Ticket, um Unterstützung zu erhalten.
      </p>
      <Button onClick={onCreateClick} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Erstes Ticket erstellen
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function PortalTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await portalApi.listTickets();
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tickets konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const handleCreated = (ticket: PortalTicket) => {
    setTickets((prev) => [ticket, ...prev]);
  };

  const handleRowClick = (ticket: PortalTicket) => {
    navigate(`/portal/tickets/${ticket.id}`);
  };

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Meine Tickets</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Alle Ihre Support-Anfragen auf einen Blick.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Neues Ticket erstellen
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadTickets()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Erneut versuchen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <TicketsTableSkeleton />
      ) : tickets.length === 0 && !error ? (
        <EmptyState onCreateClick={() => setCreateOpen(true)} />
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-36 font-semibold">Ticket-Nr.</TableHead>
                <TableHead className="font-semibold">Titel</TableHead>
                <TableHead className="w-36 font-semibold">Status</TableHead>
                <TableHead className="w-28 font-semibold">Priorität</TableHead>
                <TableHead className="w-36 font-semibold">Erstellt</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => handleRowClick(ticket)}
                >
                  <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                    {ticket.ticketNumber}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-1 font-medium">{ticket.title}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-sm text-muted-foreground"
                      title={formatDate(ticket.createdAt)}
                    >
                      {formatRelativeTime(ticket.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary line */}
      {!isLoading && tickets.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'} gesamt
        </p>
      )}

      {/* Create dialog */}
      <CreateTicketDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </>
  );
}
