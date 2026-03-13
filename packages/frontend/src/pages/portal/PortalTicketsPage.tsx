import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import type { PortalTicket, PortalService, CreatePortalTicketPayload } from '@/api/portal';
import { formatDate, formatRelativeTime } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status & Priority helpers
// ---------------------------------------------------------------------------

type TicketStatus = PortalTicket['status'];
type TicketPriority = PortalTicket['priority'];

function StatusBadge({ status }: { status: TicketStatus }) {
  const { t } = useTranslation('portal');
  const variantMap: Record<TicketStatus, 'default' | 'warning' | 'secondary' | 'success' | 'outline'> = {
    open: 'default',
    in_progress: 'warning',
    pending: 'secondary',
    resolved: 'success',
    closed: 'outline',
  };
  return (
    <Badge variant={variantMap[status]}>
      {t(`status.${status}`)}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { t } = useTranslation('portal');
  const variantMap: Record<TicketPriority, 'secondary' | 'warning' | 'destructive' | 'outline'> = {
    low: 'secondary',
    medium: 'outline',
    high: 'warning',
    critical: 'destructive',
  };
  return (
    <Badge variant={variantMap[priority]}>
      {t(`priority.${priority}`)}
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
  const { t } = useTranslation('portal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ticketType, setTicketType] = useState<'incident' | 'change' | 'request'>('incident');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [services, setServices] = useState<PortalService[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available services when dialog opens
  useEffect(() => {
    if (open) {
      portalApi.listServices().then(setServices).catch(() => {
        // Non-fatal — service catalog may not be configured
      });
    }
  }, [open]);

  // Reset form state when dialog closes
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle('');
      setDescription('');
      setTicketType('incident');
      setPriority('medium');
      setSelectedServiceId('');
      setError(null);
    }
    onOpenChange(next);
  };

  // When user selects a service, auto-set type to request and pre-fill title
  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (serviceId) {
      const svc = services.find((s) => s.id === serviceId);
      if (svc) {
        setTicketType('request');
        if (!title.trim()) {
          setTitle(svc.title);
        }
      }
    }
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
        ...(selectedServiceId ? { serviceDescriptionId: selectedServiceId } : {}),
      };
      const ticket = await portalApi.createTicket(payload);
      onCreated(ticket);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('create.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-create-portal-ticket">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('create.description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-create-portal-ticket">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Service Catalog (optional) */}
          {services.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="ct-service">{t('create.field_service')}</Label>
              <Select
                value={selectedServiceId}
                onValueChange={handleServiceSelect}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ct-service">
                  <SelectValue placeholder={t('create.field_service_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('create.field_service_none')}</SelectItem>
                  {services.map((svc) => (
                    <SelectItem key={svc.id} value={svc.id}>
                      {svc.code} — {svc.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ct-title">
              {t('create.field_title')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ct-title"
              placeholder={t('create.field_title_placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isSubmitting}
              autoFocus
              data-testid="input-portal-ticket-title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ct-description">{t('create.field_description')}</Label>
            <Textarea
              id="ct-description"
              placeholder={t('create.field_description_placeholder')}
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
              <Label htmlFor="ct-type">{t('create.field_type')}</Label>
              <Select
                value={ticketType}
                onValueChange={(v) => setTicketType(v as 'incident' | 'change' | 'request')}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ct-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incident">{t('create.type_incident')}</SelectItem>
                  <SelectItem value="change">{t('create.type_change')}</SelectItem>
                  <SelectItem value="request">{t('create.type_request')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ct-priority">{t('create.field_priority')}</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TicketPriority)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ct-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('priority.low')}</SelectItem>
                  <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                  <SelectItem value="high">{t('priority.high')}</SelectItem>
                  <SelectItem value="critical">{t('priority.critical')}</SelectItem>
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
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim()} data-testid="btn-submit-portal-ticket">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('create.submitting')}
                </>
              ) : (
                t('create.submit')
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
  const { t } = useTranslation('portal');
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <TicketIcon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">{t('tickets.empty_title')}</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">{t('tickets.empty_text')}</p>
      <Button onClick={onCreateClick} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        {t('tickets.empty_cta')}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function PortalTicketsPage() {
  const { t } = useTranslation('portal');
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
      setError(err instanceof Error ? err.message : t('tickets.error_load'));
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-testid="page-portal-tickets">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('tickets.title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('tickets.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="sm:shrink-0" data-testid="btn-create-portal-ticket">
          <Plus className="mr-2 h-4 w-4" />
          {t('tickets.create_button')}
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
          <Table data-testid="table-portal-tickets">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-36 font-semibold">{t('tickets.col_number')}</TableHead>
                <TableHead className="font-semibold">{t('tickets.col_title')}</TableHead>
                <TableHead className="w-36 font-semibold">{t('tickets.col_status')}</TableHead>
                <TableHead className="w-28 font-semibold">{t('tickets.col_priority')}</TableHead>
                <TableHead className="w-36 font-semibold">{t('tickets.col_created')}</TableHead>
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
          {t('tickets.count_other', { count: tickets.length })}
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
