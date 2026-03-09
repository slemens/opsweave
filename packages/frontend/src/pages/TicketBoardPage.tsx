import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  Clock,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  useBoardData,
  useCreateTicket,
  useGroups,
} from '@/api/tickets';
import type { TicketWithRelations, CreateTicketPayload } from '@/api/tickets';
import type { TicketType, TicketPriority, TicketStatus } from '@opsweave/shared';
import { TICKET_TYPES, TICKET_PRIORITIES, TICKET_STATUSES } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BOARD_COLUMNS: TicketStatus[] = ['open', 'in_progress', 'pending', 'resolved', 'closed'];

const columnDotColors: Record<TicketStatus, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  pending: 'bg-orange-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-slate-400 dark:bg-slate-500',
};

const priorityBadgeVariants: Record<
  TicketPriority,
  { className: string }
> = {
  critical: { className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800' },
  high: { className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  medium: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  low: { className: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
};

const ticketTypeBadgeColors: Record<TicketType, string> = {
  incident: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  problem: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  change: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isSlaApproachingBreach(ticket: TicketWithRelations): 'warning' | 'breached' | null {
  if (ticket.sla_breached === 1) return 'breached';
  if (!ticket.sla_resolve_due) return null;
  const dueDate = new Date(ticket.sla_resolve_due);
  const now = new Date();
  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue <= 0) return 'breached';
  if (hoursUntilDue <= 2) return 'warning';
  return null;
}

// ---------------------------------------------------------------------------
// TicketCard Component
// ---------------------------------------------------------------------------

interface TicketCardProps {
  ticket: TicketWithRelations;
  locale: string;
}

function TicketCard({ ticket, locale }: TicketCardProps) {
  const { t } = useTranslation('tickets');
  const navigate = useNavigate();
  const slaStatus = isSlaApproachingBreach(ticket);

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 active:scale-[0.98] group"
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/tickets/${ticket.id}`);
        }
      }}
    >
      <CardContent className="p-3.5 space-y-2.5">
        {/* Top row: Ticket number + SLA indicator */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn('text-[11px] font-mono font-medium px-1.5 py-0', ticketTypeBadgeColors[ticket.ticket_type])}
          >
            {ticket.ticket_number}
          </Badge>
          {slaStatus && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      'flex h-2 w-2 rounded-full shrink-0',
                      slaStatus === 'breached' ? 'bg-red-500 animate-pulse' : 'bg-amber-500',
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {slaStatus === 'breached'
                    ? t('fields.sla_breached')
                    : t('sla_approaching')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {ticket.title}
        </p>

        {/* Bottom row: Priority + Assignee + Date */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <Badge
            variant="outline"
            className={cn('text-[11px] px-1.5 py-0 font-medium', priorityBadgeVariants[ticket.priority].className)}
          >
            {t(`priorities.${ticket.priority}`)}
          </Badge>

          <div className="flex items-center gap-2">
            {ticket.assignee ? (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {getInitials(ticket.assignee.display_name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {ticket.assignee.display_name}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <User className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {t('unassigned')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(ticket.created_at, locale)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Board Column Component
// ---------------------------------------------------------------------------

interface BoardColumnProps {
  status: TicketStatus;
  tickets: TicketWithRelations[];
  count: number;
  locale: string;
}

function BoardColumn({ status, tickets, count, locale }: BoardColumnProps) {
  const { t } = useTranslation('tickets');

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('h-2.5 w-2.5 rounded-full', columnDotColors[status])} />
        <h3 className="text-sm font-semibold text-foreground">
          {t(`statuses.${status}`)}
        </h3>
        <Badge
          variant="secondary"
          className="ml-auto text-xs tabular-nums h-5 min-w-[1.25rem] flex items-center justify-center"
        >
          {count}
        </Badge>
      </div>

      {/* Column body */}
      <div className="flex-1 space-y-2 min-h-[200px] rounded-lg bg-muted/40 dark:bg-muted/20 p-2 border border-transparent">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="h-8 w-8 rounded-full bg-muted/60 dark:bg-muted/40 flex items-center justify-center mb-2">
              <span className={cn('h-2 w-2 rounded-full', columnDotColors[status], 'opacity-40')} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('board.empty')}
            </p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} locale={locale} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Board
// ---------------------------------------------------------------------------

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {BOARD_COLUMNS.map((col) => (
        <div key={col} className="flex-shrink-0 w-72">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-5 rounded-full ml-auto" />
          </div>
          <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/40 dark:bg-muted/20 p-2">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-3.5 space-y-2.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-4 w-14" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Ticket Dialog
// ---------------------------------------------------------------------------

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();
  const createTicket = useCreateTicket();
  const { data: groupsData } = useGroups();

  const [ticketType, setTicketType] = useState<TicketType>('incident');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [groupId, setGroupId] = useState<string>('');
  const [titleError, setTitleError] = useState('');

  const groups = groupsData?.data ?? [];

  const resetForm = useCallback(() => {
    setTicketType('incident');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setGroupId('');
    setTitleError('');
  }, []);

  const handleSubmit = useCallback(async () => {
    // Validate
    if (title.trim().length < 3) {
      setTitleError(t('validation.title_min_length'));
      return;
    }
    setTitleError('');

    const payload: CreateTicketPayload = {
      ticket_type: ticketType,
      title: title.trim(),
      description: description.trim() || title.trim(),
      priority,
      source: 'manual',
    };

    if (groupId) {
      payload.assignee_group_id = groupId;
    }

    try {
      await createTicket.mutateAsync(payload);
      toast.success(t('create_success'));
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error(t('create_error'));
    }
  }, [ticketType, title, description, priority, groupId, createTicket, t, resetForm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('create')}</DialogTitle>
          <DialogDescription>{t('create_description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Ticket Type */}
          <div className="space-y-2">
            <Label htmlFor="ticket-type">{t('fields.type')}</Label>
            <Select value={ticketType} onValueChange={(v) => setTicketType(v as TicketType)}>
              <SelectTrigger id="ticket-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ticket-title">{t('fields.title')}</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim().length >= 3) setTitleError('');
              }}
              placeholder={t('placeholder_title')}
              className={cn(titleError && 'border-destructive focus-visible:ring-destructive')}
            />
            {titleError && (
              <p className="text-xs text-destructive">{titleError}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ticket-desc">{t('fields.description')}</Label>
            <Textarea
              id="ticket-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('placeholder_description')}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="ticket-priority">{t('fields.priority')}</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
              <SelectTrigger id="ticket-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <span className="flex items-center gap-2">
                      <span className={cn(
                        'h-2 w-2 rounded-full',
                        p === 'critical' && 'bg-red-500',
                        p === 'high' && 'bg-orange-500',
                        p === 'medium' && 'bg-blue-500',
                        p === 'low' && 'bg-slate-400',
                      )} />
                      {t(`priorities.${p}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group */}
          <div className="space-y-2">
            <Label htmlFor="ticket-group">{t('fields.group')}</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger id="ticket-group">
                <SelectValue placeholder={t('select_group')} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            {tCommon('actions.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTicket.isPending}
          >
            {createTicket.isPending ? tCommon('status.saving') : t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function TicketBoardPage() {
  const { t, i18n } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: boardData, isLoading, isError, refetch } = useBoardData();

  // Build column data from API response
  const columns = BOARD_COLUMNS.map((status) => {
    const column = boardData?.data?.find((c) => c.status === status);
    let tickets = column?.tickets ?? [];

    // Apply client-side filters
    if (typeFilter !== 'all') {
      tickets = tickets.filter((t) => t.ticket_type === typeFilter);
    }
    if (priorityFilter !== 'all') {
      tickets = tickets.filter((t) => t.priority === priorityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      tickets = tickets.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.ticket_number.toLowerCase().includes(q),
      );
    }

    return {
      status,
      tickets,
      count: tickets.length,
    };
  });

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('board.title')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t('board.drag_hint')}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('create')}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('fields.type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter_all_types')}</SelectItem>
            {TICKET_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('fields.priority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter_all_priorities')}</SelectItem>
            {TICKET_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                <span className="flex items-center gap-2">
                  <span className={cn(
                    'h-2 w-2 rounded-full',
                    p === 'critical' && 'bg-red-500',
                    p === 'high' && 'bg-orange-500',
                    p === 'medium' && 'bg-blue-500',
                    p === 'low' && 'bg-slate-400',
                  )} />
                  {t(`priorities.${p}`)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tCommon('actions.search')}
            className="pl-8"
          />
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => void refetch()}
          aria-label={tCommon('actions.refresh')}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Board content */}
      {isLoading ? (
        <BoardSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{tCommon('status.error')}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {tCommon('errors.generic')}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {tCommon('actions.retry')}
          </Button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {columns.map((col) => (
            <BoardColumn
              key={col.status}
              status={col.status}
              tickets={col.tickets}
              count={col.count}
              locale={locale}
            />
          ))}
        </div>
      )}

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
