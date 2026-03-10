import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  AlertCircle,
  RefreshCw,
  Clock,
  User,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Ticket as TicketIcon,
  FilterX,
  GitBranch,
  Download,
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
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  useBoardData,
  useTickets,
  useCreateTicket,
  useCategories,
} from '@/api/tickets';
// AUDIT-FIX: M-09 — Import from domain-specific API modules
import { useGroups } from '@/api/groups';
import { useUsers } from '@/api/users';
import { useCustomers } from '@/api/customers';
import type { TicketWithRelations, CreateTicketPayload, TicketListParams } from '@/api/tickets';
import type { TicketType, TicketPriority, TicketStatus } from '@opsweave/shared';
import { TICKET_TYPES, TICKET_PRIORITIES, TICKET_STATUSES, TICKET_IMPACTS, TICKET_URGENCIES, calculatePriority } from '@opsweave/shared';
import { useAuthStore } from '@/stores/auth-store';

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

const statusDotColors: Record<TicketStatus, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  pending: 'bg-orange-500',
  resolved: 'bg-emerald-500',
  closed: 'bg-slate-400',
};

// Preset view definitions
type PresetView = 'all' | 'my_tickets' | 'incidents' | 'changes' | 'problems' | 'open' | 'unassigned';

interface PresetConfig {
  key: PresetView;
  getParams: (userId: string) => Partial<TicketListParams>;
}

const PRESET_VIEWS: PresetConfig[] = [
  { key: 'all', getParams: () => ({}) },
  { key: 'my_tickets', getParams: (userId) => ({ assignee_id: userId }) },
  { key: 'open', getParams: () => ({ status: 'open' as TicketStatus }) },
  { key: 'incidents', getParams: () => ({ ticket_type: 'incident' as TicketType }) },
  { key: 'changes', getParams: () => ({ ticket_type: 'change' as TicketType }) },
  { key: 'problems', getParams: () => ({ ticket_type: 'problem' as TicketType }) },
];

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
// TicketCard Component (for Board view)
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
// List Skeleton
// ---------------------------------------------------------------------------

function ListSkeleton() {
  return (
    <div className="border rounded-lg">
      <div className="border-b px-3 py-3">
        <div className="flex gap-4">
          {[80, 200, 60, 60, 60, 100, 80].map((w, i) => (
            <Skeleton key={i} className="h-4" style={{ width: w }} />
          ))}
        </div>
      </div>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="border-b last:border-0 px-3 py-3">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ticket List View Component
// ---------------------------------------------------------------------------

type SortField = 'ticket_number' | 'title' | 'status' | 'priority' | 'ticket_type' | 'created_at' | 'updated_at';
type SortOrder = 'asc' | 'desc';

interface TicketListViewProps {
  tickets: TicketWithRelations[];
  isLoading: boolean;
  isError: boolean;
  locale: string;
  page: number;
  totalPages: number;
  totalCount: number;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onRefetch: () => void;
  // Column filters
  statusFilter: string;
  typeFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  groupFilter: string;
  customerFilter: string;
  categoryFilter: string;
  onStatusFilterChange: (v: string) => void;
  onTypeFilterChange: (v: string) => void;
  onPriorityFilterChange: (v: string) => void;
  onAssigneeFilterChange: (v: string) => void;
  onGroupFilterChange: (v: string) => void;
  onCustomerFilterChange: (v: string) => void;
  onCategoryFilterChange: (v: string) => void;
  // Data for filter dropdowns
  assigneeOptions: Array<{ value: string; label: string }>;
  groupOptions: Array<{ value: string; label: string }>;
  customerOptions: Array<{ value: string; label: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
}

function TicketListView({
  tickets,
  isLoading,
  isError,
  locale,
  page,
  totalPages,
  totalCount,
  sortField,
  sortOrder,
  onSort,
  onPageChange,
  onRefetch,
  statusFilter,
  typeFilter,
  priorityFilter,
  assigneeFilter,
  groupFilter,
  customerFilter,
  categoryFilter,
  onStatusFilterChange,
  onTypeFilterChange,
  onPriorityFilterChange,
  onAssigneeFilterChange,
  onGroupFilterChange,
  onCustomerFilterChange,
  onCategoryFilterChange,
  assigneeOptions,
  groupOptions,
  customerOptions,
  categoryOptions,
}: TicketListViewProps) {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();
  const navigate = useNavigate();

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground/40" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  }

  function SortableHead({ field, children, className: extraClass }: { field: SortField; children: React.ReactNode; className?: string }) {
    return (
      <TableHead
        className={cn('cursor-pointer select-none hover:text-foreground transition-colors', extraClass)}
        onClick={() => onSort(field)}
      >
        <span className="flex items-center">
          {children}
          <SortIcon field={field} />
        </span>
      </TableHead>
    );
  }

  function FilterableHead({
    field,
    label,
    filterValue,
    onFilterChange,
    options,
    allLabel,
  }: {
    field: SortField;
    label: string;
    filterValue: string;
    onFilterChange: (v: string) => void;
    options: Array<{ value: string; label: string; dot?: string }>;
    allLabel: string;
  }) {
    return (
      <TableHead className="p-0">
        <div className="flex flex-col">
          <span
            className="flex items-center px-3 pt-2 pb-1 cursor-pointer select-none hover:text-foreground transition-colors text-xs font-medium text-muted-foreground"
            onClick={() => onSort(field)}
          >
            {label}
            <SortIcon field={field} />
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
                    <span className="flex items-center gap-1.5">
                      {opt.dot && <span className={cn('h-1.5 w-1.5 rounded-full', opt.dot)} />}
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TableHead>
    );
  }

  function FilterOnlyHead({
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

  if (isLoading) return <ListSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{tCommon('status.error')}</p>
        <p className="text-sm text-muted-foreground mb-4">{tCommon('errors.generic')}</p>
        <Button variant="outline" onClick={onRefetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {tCommon('actions.retry')}
        </Button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <TicketIcon className="h-8 w-8 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{t('list.empty')}</p>
        <p className="text-sm text-muted-foreground">{t('list.empty_hint')}</p>
      </div>
    );
  }

  // AUDIT-FIX: M-16 — CSV export for filtered ticket list
  const handleExportCsv = useCallback(() => {
    const headers = [
      t('fields.ticket_number'),
      t('fields.title'),
      t('fields.type'),
      t('fields.status'),
      t('fields.priority'),
      t('fields.created_at'),
      t('fields.assignee'),
    ];
    const escapeField = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };
    const rows = tickets.map((ticket) => [
      escapeField(ticket.ticket_number),
      escapeField(ticket.title),
      escapeField(t(`types.${ticket.ticket_type}`)),
      escapeField(t(`statuses.${ticket.status}`)),
      escapeField(t(`priorities.${ticket.priority}`)),
      escapeField(new Date(ticket.created_at).toISOString().slice(0, 10)),
      escapeField(ticket.assignee?.display_name ?? '-'),
    ]);

    const csv = [headers.map(escapeField).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `opsweave-tickets-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tickets, t]);

  return (
    <div className="space-y-3">
      {/* SLA legend + export button */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium">{t('list.sla_legend')}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />{t('sla.ok')}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" />{t('sla.warning')}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />{t('sla.breached')}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300 inline-block" />{t('sla.none')}</span>
        {/* AUDIT-FIX: M-16 — CSV export button */}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-6 text-xs"
          onClick={handleExportCsv}
          disabled={tickets.length === 0}
        >
          <Download className="mr-1.5 h-3 w-3" />
          {tCommon('actions.export')}
        </Button>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table className="min-w-[1250px]">
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <SortableHead field="ticket_number">{t('fields.ticket_number')}</SortableHead>
              <SortableHead field="title">{t('fields.title')}</SortableHead>
              <FilterableHead
                field="ticket_type"
                label={t('fields.type')}
                filterValue={typeFilter}
                onFilterChange={onTypeFilterChange}
                allLabel={t('filter_all_types')}
                options={TICKET_TYPES.map((type) => ({ value: type, label: t(`types.${type}`) }))}
              />
              <FilterableHead
                field="status"
                label={t('fields.status')}
                filterValue={statusFilter}
                onFilterChange={onStatusFilterChange}
                allLabel={tCommon('status.all', { defaultValue: 'Alle' })}
                options={TICKET_STATUSES.map((s) => ({
                  value: s,
                  label: t(`statuses.${s}`),
                  dot: statusDotColors[s],
                }))}
              />
              <FilterableHead
                field="priority"
                label={t('fields.priority')}
                filterValue={priorityFilter}
                onFilterChange={onPriorityFilterChange}
                allLabel={t('filter_all_priorities')}
                options={TICKET_PRIORITIES.map((p) => ({
                  value: p,
                  label: t(`priorities.${p}`),
                  dot: p === 'critical' ? 'bg-red-500' : p === 'high' ? 'bg-orange-500' : p === 'medium' ? 'bg-blue-500' : 'bg-slate-400',
                }))}
              />
              <FilterOnlyHead
                label={t('fields.assignee')}
                filterValue={assigneeFilter}
                onFilterChange={onAssigneeFilterChange}
                allLabel={t('filter_all_assignees')}
                options={assigneeOptions}
              />
              <FilterOnlyHead
                label={t('fields.group')}
                filterValue={groupFilter}
                onFilterChange={onGroupFilterChange}
                allLabel={t('filter_all_groups')}
                options={groupOptions}
              />
              <FilterOnlyHead
                label={t('fields.customer')}
                filterValue={customerFilter}
                onFilterChange={onCustomerFilterChange}
                allLabel={t('filter_all_customers')}
                options={customerOptions}
              />
              <FilterOnlyHead
                label={t('fields.category')}
                filterValue={categoryFilter}
                onFilterChange={onCategoryFilterChange}
                allLabel={t('filter_all_categories')}
                options={categoryOptions}
              />
              <SortableHead field="created_at" className="min-w-[140px]">{t('fields.created_at')}</SortableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => {
              const slaStatus = isSlaApproachingBreach(ticket);
              return (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-[11px] font-mono font-medium px-1.5 py-0', ticketTypeBadgeColors[ticket.ticket_type])}
                      >
                        {ticket.ticket_number}
                      </Badge>
                      {slaStatus && (
                        <span
                          className={cn(
                            'flex h-2 w-2 rounded-full shrink-0',
                            slaStatus === 'breached' ? 'bg-red-500 animate-pulse' : 'bg-amber-500',
                          )}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="flex items-center gap-1.5">
                      {ticket.parent_ticket_id && (
                        <GitBranch className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <span className="line-clamp-1 text-sm font-medium">{ticket.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0', ticketTypeBadgeColors[ticket.ticket_type])}>
                      {t(`types.${ticket.ticket_type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', statusDotColors[ticket.status])} />
                      <span className="text-xs whitespace-nowrap">{t(`statuses.${ticket.status}`)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-[11px] px-1.5 py-0 font-medium', priorityBadgeVariants[ticket.priority].className)}
                    >
                      {t(`priorities.${ticket.priority}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {getInitials(ticket.assignee.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{ticket.assignee.display_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.assignee_group?.name ?? <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.customer?.name ?? <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {ticket.category?.name ?? <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(ticket.created_at, locale)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground tabular-nums">
          {t('list.showing', { count: totalCount })}
          {totalPages > 1 && ` · ${t('list.page_info', { page, pages: totalPages })}`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Ticket Dialog
// ---------------------------------------------------------------------------

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentTicketId?: string | null;
  parentTicketType?: TicketType | null;
}

function CreateTicketDialog({ open, onOpenChange, parentTicketId, parentTicketType }: CreateTicketDialogProps) {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();
  const createTicket = useCreateTicket();
  // AUDIT-FIX: M-10 — Track loading states for Select skeleton loaders
  const { data: groupsData, isLoading: groupsLoading } = useGroups();
  const { data: customersData, isLoading: customersLoading } = useCustomers();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();

  const [ticketType, setTicketType] = useState<TicketType>(parentTicketType ?? 'incident');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [impact, setImpact] = useState<string>('');
  const [urgency, setUrgency] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [titleError, setTitleError] = useState('');

  const groups = groupsData?.data ?? [];
  const customers = (customersData?.data ?? []).filter((c) => c.is_active);
  const categories = (categoriesData?.data ?? []).filter(
    (c) => c.is_active && (c.applies_to === 'all' || c.applies_to === ticketType),
  );

  // Auto-calculate priority from ITIL matrix
  const autoPriority = (impact && urgency) ? calculatePriority(impact, urgency) : null;
  const effectivePriority = autoPriority ?? priority;

  const resetForm = useCallback(() => {
    setTicketType(parentTicketType ?? 'incident');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setImpact('');
    setUrgency('');
    setGroupId('');
    setCustomerId('');
    setCategoryId('');
    setTitleError('');
  }, [parentTicketType]);

  const handleSubmit = useCallback(async () => {
    if (title.trim().length < 3) {
      setTitleError(t('validation.title_min_length'));
      return;
    }
    setTitleError('');

    const payload: CreateTicketPayload = {
      ticket_type: ticketType,
      title: title.trim(),
      description: description.trim() || title.trim(),
      priority: effectivePriority,
      source: 'manual',
    };

    if (impact) payload.impact = impact;
    if (urgency) payload.urgency = urgency;
    if (parentTicketId) payload.parent_ticket_id = parentTicketId;
    if (groupId) payload.assignee_group_id = groupId;
    if (customerId) payload.customer_id = customerId;
    if (categoryId) payload.category_id = categoryId;

    try {
      await createTicket.mutateAsync(payload);
      toast.success(t('create_success'));
      resetForm();
      onOpenChange(false);
    } catch {
      toast.error(t('create_error'));
    }
  }, [ticketType, title, description, effectivePriority, impact, urgency, groupId, customerId, categoryId, parentTicketId, createTicket, t, resetForm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{parentTicketId ? t('parent_child.create_child') : t('create')}</DialogTitle>
          <DialogDescription>{t('create_description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Parent ticket info */}
          {parentTicketId && (
            <div className="rounded-lg bg-muted/50 border px-3 py-2 text-sm text-muted-foreground">
              {t('parent_child.linked_to_parent')} <span className="font-mono font-medium text-foreground">{parentTicketId.slice(0, 8)}…</span>
            </div>
          )}

          {/* Ticket Type */}
          <div className="space-y-2">
            <Label htmlFor="ticket-type">{t('fields.type')}</Label>
            <Select
              value={ticketType}
              onValueChange={(v) => setTicketType(v as TicketType)}
              disabled={!!parentTicketType}
            >
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
            {parentTicketType && (
              <p className="text-xs text-muted-foreground">{t('parent_child.type_mismatch')}</p>
            )}
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

          {/* Impact & Urgency row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ticket-impact">{t('fields.impact')}</Label>
              <Select value={impact} onValueChange={setImpact}>
                <SelectTrigger id="ticket-impact">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_IMPACTS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`impacts.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-urgency">{t('fields.urgency')}</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger id="ticket-urgency">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_URGENCIES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`urgencies.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority — auto or manual */}
          <div className="space-y-2">
            <Label htmlFor="ticket-priority">{t('fields.priority')}</Label>
            {autoPriority ? (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  autoPriority === 'critical' && 'bg-red-500',
                  autoPriority === 'high' && 'bg-orange-500',
                  autoPriority === 'medium' && 'bg-blue-500',
                  autoPriority === 'low' && 'bg-slate-400',
                )} />
                {t(`priorities.${autoPriority}`)}
                <span className="ml-auto text-[10px] text-muted-foreground">{t('priority_auto_calculated')}</span>
              </div>
            ) : (
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
            )}
          </div>

          {/* Group — AUDIT-FIX: M-10 — Skeleton while loading */}
          <div className="space-y-2">
            <Label htmlFor="ticket-group">{t('fields.group')}</Label>
            {groupsLoading ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
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
            )}
          </div>

          {/* Customer — AUDIT-FIX: M-10 — Skeleton while loading */}
          <div className="space-y-2">
            <Label htmlFor="ticket-customer">{t('fields.customer')}</Label>
            {customersLoading ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="ticket-customer">
                  <SelectValue placeholder={t('select_customer')} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Category — AUDIT-FIX: M-10 — Skeleton while loading */}
          <div className="space-y-2">
            <Label htmlFor="ticket-category">{t('fields.category')}</Label>
            {categoriesLoading ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="ticket-category">
                  <SelectValue placeholder={t('select_category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
  const locale = i18n.language?.startsWith('de') ? 'de-DE' : 'en-US';
  const user = useAuthStore((s) => s.user);

  const [searchParams, setSearchParams] = useSearchParams();

  // View mode (board or list) — persisted in URL + localStorage
  const storedView = typeof window !== 'undefined' ? localStorage.getItem('opsweave_ticket_view') : null;
  const viewMode = (searchParams.get('view') ?? storedView ?? 'board') as 'board' | 'list';
  const setViewMode = useCallback((mode: 'board' | 'list') => {
    localStorage.setItem('opsweave_ticket_view', mode);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('view', mode);
      // Reset page when switching views
      next.delete('page');
      return next;
    });
  }, [setSearchParams]);

  // Preset view — persisted in URL
  const activePreset = (searchParams.get('preset') ?? 'all') as PresetView;
  const setActivePreset = useCallback((preset: PresetView) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('preset', preset);
      next.set('view', 'list'); // Switching preset always goes to list view
      next.delete('page');
      return next;
    });
  }, [setSearchParams]);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Create dialog — can be triggered via URL params (e.g. ?parent=xxx&type=incident)
  const parentParam = searchParams.get('parent');
  const typeParam = searchParams.get('type') as TicketType | null;
  const [createDialogOpen, setCreateDialogOpen] = useState(!!parentParam);

  const handleCreateDialogClose = useCallback((isOpen: boolean) => {
    setCreateDialogOpen(isOpen);
    if (!isOpen && parentParam) {
      // Remove parent/type params from URL when dialog closes
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('parent');
        next.delete('type');
        return next;
      });
    }
  }, [parentParam, setSearchParams]);

  const hasActiveColumnFilters = typeFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || assigneeFilter !== 'all' || groupFilter !== 'all' || customerFilter !== 'all' || categoryFilter !== 'all';
  const resetColumnFilters = useCallback(() => {
    setTypeFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setAssigneeFilter('all');
    setGroupFilter('all');
    setCustomerFilter('all');
    setCategoryFilter('all');
  }, []);

  // List view sorting & pagination
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const listPage = parseInt(searchParams.get('page') ?? '1', 10);
  const setListPage = useCallback((page: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(page));
      return next;
    });
  }, [setSearchParams]);

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'created_at' ? 'desc' : 'asc');
    }
  }, [sortField]);

  // Build query params for list view
  const listParams = useMemo((): TicketListParams => {
    const presetConfig = PRESET_VIEWS.find((p) => p.key === activePreset);
    const presetParams = presetConfig?.getParams(user?.id ?? '') ?? {};

    const params: TicketListParams = {
      page: listPage,
      limit: 25,
      sort: sortField,
      order: sortOrder,
      ...presetParams,
    };

    // Additional filters from dropdowns (override preset if set)
    if (typeFilter !== 'all' && !presetParams.ticket_type) {
      params.ticket_type = typeFilter as TicketType;
    }
    if (priorityFilter !== 'all') {
      params.priority = priorityFilter as TicketPriority;
    }
    if (statusFilter !== 'all' && !presetParams.status) {
      params.status = statusFilter as TicketStatus;
    }
    if (assigneeFilter !== 'all') {
      params.assignee_id = assigneeFilter;
    }
    if (groupFilter !== 'all') {
      params.assignee_group_id = groupFilter;
    }
    if (customerFilter !== 'all') {
      params.customer_id = customerFilter;
    }
    if (categoryFilter !== 'all') {
      params.category_id = categoryFilter;
    }
    if (searchQuery.trim()) {
      params.q = searchQuery.trim();
    }

    return params;
  }, [activePreset, listPage, sortField, sortOrder, typeFilter, priorityFilter, statusFilter, assigneeFilter, groupFilter, customerFilter, categoryFilter, searchQuery, user?.id]);

  // Data hooks
  const boardQuery = useBoardData();
  const listQuery = useTickets(listParams);
  const { data: mainGroupsData } = useGroups();
  const { data: usersData } = useUsers();
  const { data: customersData } = useCustomers();
  const { data: categoriesData } = useCategories();

  // Filter options for assignee/group/customer/category dropdowns
  const assigneeOptions = useMemo(() =>
    (usersData?.data ?? []).map((u) => ({ value: u.id, label: u.display_name })),
    [usersData],
  );
  const groupOptions = useMemo(() =>
    (mainGroupsData?.data ?? []).map((g) => ({ value: g.id, label: g.name })),
    [mainGroupsData],
  );
  const customerOptions = useMemo(() =>
    (customersData?.data ?? []).filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name })),
    [customersData],
  );
  const categoryOptions = useMemo(() =>
    (categoriesData?.data ?? []).filter((c) => c.is_active).map((c) => ({ value: c.id, label: c.name })),
    [categoriesData],
  );

  // Use the appropriate query based on view mode
  const isListView = viewMode === 'list';
  const activeQuery = isListView ? listQuery : boardQuery;

  // Board columns (only for board view)
  const boardColumns = useMemo(() => {
    if (isListView || !boardQuery.data) return [];
    return BOARD_COLUMNS.map((status) => {
      const column = boardQuery.data?.columns?.find((c) => c.status === status);
      let tickets = column?.tickets ?? [];

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

      return { status, tickets, count: tickets.length };
    });
  }, [isListView, boardQuery.data, typeFilter, priorityFilter, searchQuery]);

  // List data
  const listTickets = isListView ? (listQuery.data?.data ?? []) : [];
  const listMeta = isListView ? listQuery.data?.meta : undefined;
  const totalPages = listMeta ? Math.ceil(listMeta.total / listMeta.limit) : 1;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {isListView ? t('list.title') : t('board.title')}
          </h2>
          {!isListView && (
            <p className="text-sm text-muted-foreground mt-0.5">{t('board.drag_hint')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={!isListView ? 'default' : 'ghost'}
              size="sm"
              className={cn('rounded-none h-8 px-3', !isListView && 'pointer-events-none')}
              onClick={() => setViewMode('board')}
              aria-label={t('board.view_board')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={isListView ? 'default' : 'ghost'}
              size="sm"
              className={cn('rounded-none h-8 px-3', isListView && 'pointer-events-none')}
              onClick={() => setViewMode('list')}
              aria-label={t('board.view_list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('create')}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Preset filter tabs (list view only) */}
        {isListView && (
          <div className="flex items-center gap-1 overflow-x-auto mr-auto">
            {PRESET_VIEWS.map((preset) => (
              <Button
                key={preset.key}
                variant={activePreset === preset.key ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-7 text-xs whitespace-nowrap',
                  activePreset === preset.key && 'pointer-events-none',
                )}
                onClick={() => setActivePreset(preset.key)}
              >
                {t(`views.${preset.key}`)}
              </Button>
            ))}
          </div>
        )}

        {/* Type & Priority filters (board view only — list view uses inline column filters) */}
        {!isListView && (
          <>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px] h-8">
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

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px] h-8">
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
          </>
        )}

        {/* Search */}
        <div className={cn('relative min-w-[180px]', !isListView && 'flex-1 max-w-sm')}>
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tCommon('actions.search')}
            className="pl-8 h-8"
          />
        </div>

        {/* Reset column filters (list view only, shown when filters active) */}
        {isListView && hasActiveColumnFilters && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={resetColumnFilters}
                >
                  <FilterX className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tCommon('actions.reset_filters')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Refresh */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => void activeQuery.refetch()}
          aria-label={tCommon('actions.refresh')}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {isListView ? (
        <TicketListView
          tickets={listTickets}
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          locale={locale}
          page={listPage}
          totalPages={totalPages}
          totalCount={listMeta?.total ?? 0}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={setListPage}
          onRefetch={() => void listQuery.refetch()}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          priorityFilter={priorityFilter}
          assigneeFilter={assigneeFilter}
          groupFilter={groupFilter}
          customerFilter={customerFilter}
          categoryFilter={categoryFilter}
          onStatusFilterChange={setStatusFilter}
          onTypeFilterChange={setTypeFilter}
          onPriorityFilterChange={setPriorityFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          onGroupFilterChange={setGroupFilter}
          onCustomerFilterChange={setCustomerFilter}
          onCategoryFilterChange={setCategoryFilter}
          assigneeOptions={assigneeOptions}
          groupOptions={groupOptions}
          customerOptions={customerOptions}
          categoryOptions={categoryOptions}
        />
      ) : (
        <>
          {boardQuery.isLoading ? (
            <BoardSkeleton />
          ) : boardQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-destructive/10 p-3 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{tCommon('status.error')}</p>
              <p className="text-sm text-muted-foreground mb-4">{tCommon('errors.generic')}</p>
              <Button variant="outline" onClick={() => void boardQuery.refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {tCommon('actions.retry')}
              </Button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
              {boardColumns.map((col) => (
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
        </>
      )}

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogClose}
        parentTicketId={parentParam}
        parentTicketType={typeParam}
      />
    </div>
  );
}
