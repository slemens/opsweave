import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Clock,
  Send,
  ArrowRight,
  ShieldAlert,
  MessageSquare,
  History,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  useTicket,
  useTicketComments,
  useTicketHistory,
  useUpdateTicketStatus,
  useUpdateTicketPriority,
  useAddComment,
} from '@/api/tickets';
import type { TicketCommentWithAuthor, HistoryWithUser } from '@/api/tickets';
import type { TicketStatus, TicketPriority } from '@opsweave/shared';
import { TICKET_STATUSES, TICKET_PRIORITIES } from '@opsweave/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  closed: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
};

const priorityColors: Record<TicketPriority, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
};

const priorityDotColors: Record<TicketPriority, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-blue-500',
  low: 'bg-slate-400',
};

const ticketTypeBadgeColors: Record<string, string> = {
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

// ---------------------------------------------------------------------------
// Comment Component
// ---------------------------------------------------------------------------

interface CommentItemProps {
  comment: TicketCommentWithAuthor;
  locale: string;
}

function CommentItem({ comment, locale }: CommentItemProps) {
  const { t } = useTranslation('tickets');
  const authorName = comment.author?.display_name ?? t('unknown_user');

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{authorName}</span>
          {comment.is_internal === 1 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
              {t('comments.internal')}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(comment.created_at, locale)}
          </span>
        </div>
        <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Item Component
// ---------------------------------------------------------------------------

interface HistoryItemProps {
  entry: HistoryWithUser;
  locale: string;
}

function HistoryItem({ entry, locale }: HistoryItemProps) {
  const { t } = useTranslation('tickets');
  const userName = entry.changed_by_user?.display_name ?? t('unknown_user');

  return (
    <div className="flex gap-3 py-2.5">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>

      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-baseline gap-1.5 flex-wrap text-sm">
          <span className="font-medium">{userName}</span>
          <span className="text-muted-foreground">{t('history.changed')}</span>
          <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-mono">
            {t(`fields.${entry.field_changed}`, { defaultValue: entry.field_changed })}
          </Badge>
        </div>

        {(entry.old_value || entry.new_value) && (
          <div className="flex items-center gap-2 mt-1 text-xs">
            {entry.old_value && (
              <span className="text-muted-foreground line-through">
                {entry.old_value}
              </span>
            )}
            {entry.old_value && entry.new_value && (
              <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            )}
            {entry.new_value && (
              <span className="text-foreground font-medium">
                {entry.new_value}
              </span>
            )}
          </div>
        )}

        <span className="text-[11px] text-muted-foreground mt-1 block">
          {formatRelativeTime(entry.changed_at, locale)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Comment Form
// ---------------------------------------------------------------------------

interface AddCommentFormProps {
  ticketId: string;
}

function AddCommentForm({ ticketId }: AddCommentFormProps) {
  const { t } = useTranslation('tickets');
  const addComment = useAddComment();
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;

    try {
      await addComment.mutateAsync({
        ticketId,
        content: content.trim(),
        is_internal: isInternal,
      });
      setContent('');
      setIsInternal(false);
      toast.success(t('comments.add_success'));
    } catch {
      toast.error(t('comments.add_error'));
    }
  }, [content, isInternal, ticketId, addComment, t]);

  return (
    <div className="space-y-3 pt-3 border-t">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('comments.placeholder')}
        rows={3}
        className="resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="internal-switch"
            checked={isInternal}
            onCheckedChange={setIsInternal}
          />
          <Label htmlFor="internal-switch" className="text-sm text-muted-foreground cursor-pointer">
            {t('comments.internal')}
          </Label>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || addComment.isPending}
        >
          <Send className="mr-2 h-3.5 w-3.5" />
          {t('comments.add')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  const { t } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('comments.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tCommon('actions.view')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  {i < 5 && <Separator className="mt-3" />}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar Field
// ---------------------------------------------------------------------------

interface SidebarFieldProps {
  label: string;
  children: React.ReactNode;
  showSeparator?: boolean;
}

function SidebarField({ label, children, showSeparator = true }: SidebarFieldProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 text-sm">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <div className="text-right">{children}</div>
      </div>
      {showSeparator && <Separator />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'de' ? 'de-DE' : 'en-US';

  const { data: ticketData, isLoading, isError, refetch } = useTicket(id ?? '');
  const { data: commentsData, isLoading: commentsLoading } = useTicketComments(id ?? '');
  const { data: historyData, isLoading: historyLoading } = useTicketHistory(id ?? '');

  const updateStatus = useUpdateTicketStatus();
  const updatePriority = useUpdateTicketPriority();

  const ticket = ticketData;
  const comments = commentsData ?? [];
  const history = historyData ?? [];

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ id, status: newStatus as TicketStatus });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateStatus, t]);

  const handlePriorityChange = useCallback(async (newPriority: string) => {
    if (!id) return;
    try {
      await updatePriority.mutateAsync({ id, priority: newPriority as TicketPriority });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updatePriority, t]);

  // Loading state
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // Error state
  if (isError || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{tCommon('status.error')}</p>
        <p className="text-sm text-muted-foreground mb-4">
          {tCommon('errors.not_found')}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/tickets')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tCommon('actions.back')}
          </Button>
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {tCommon('actions.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const isBreach = ticket.sla_breached === 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/tickets')}
          aria-label={tCommon('actions.back')}
          className="shrink-0 mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge
              variant="outline"
              className={cn('font-mono text-xs', ticketTypeBadgeColors[ticket.ticket_type])}
            >
              {ticket.ticket_number}
            </Badge>
            <Badge className={cn('text-xs', statusColors[ticket.status])}>
              {t(`statuses.${ticket.status}`)}
            </Badge>
          </div>
          <h2 className="text-xl font-bold tracking-tight mt-1.5 break-words">
            {ticket.title}
          </h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ============================================================= */}
        {/* Left column: Description, Comments, History                    */}
        {/* ============================================================= */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('fields.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.description ? (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                  {ticket.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t('no_description')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tabs: Comments / History */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
              <TabsTrigger value="comments" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                {t('comments.title')}
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                    {comments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                {t('history.title')}
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                    {history.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Comments Tab */}
            <TabsContent value="comments">
              <Card>
                <CardContent className="pt-4">
                  {commentsLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex gap-3 py-2">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('comments.no_comments')}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {comments.map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          locale={locale}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add Comment Form */}
                  {id && <AddCommentForm ticketId={id} />}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history">
              <Card>
                <CardContent className="pt-4">
                  {historyLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3 py-2">
                          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <History className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('history.no_history')}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {history.map((entry) => (
                        <HistoryItem
                          key={entry.id}
                          entry={entry}
                          locale={locale}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ============================================================= */}
        {/* Right sidebar                                                  */}
        {/* ============================================================= */}
        <div className="space-y-4">
          {/* Status & Priority Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('detail')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Status */}
              <SidebarField label={t('fields.status')}>
                <Select
                  value={ticket.status}
                  onValueChange={handleStatusChange}
                  disabled={updateStatus.isPending}
                >
                  <SelectTrigger className="h-7 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`statuses.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarField>

              {/* Priority */}
              <SidebarField label={t('fields.priority')}>
                <Select
                  value={ticket.priority}
                  onValueChange={handlePriorityChange}
                  disabled={updatePriority.isPending}
                >
                  <SelectTrigger className="h-7 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', priorityDotColors[p])} />
                          {t(`priorities.${p}`)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarField>

              {/* Type */}
              <SidebarField label={t('fields.type')}>
                <Badge
                  variant="outline"
                  className={cn('text-xs', ticketTypeBadgeColors[ticket.ticket_type])}
                >
                  {t(`types.${ticket.ticket_type}`)}
                </Badge>
              </SidebarField>

              {/* Assignee */}
              <SidebarField label={t('fields.assignee')}>
                <span className="text-sm">
                  {ticket.assignee?.display_name ?? (
                    <span className="text-muted-foreground italic">{t('unassigned')}</span>
                  )}
                </span>
              </SidebarField>

              {/* Group */}
              <SidebarField label={t('fields.group')}>
                <span className="text-sm">
                  {ticket.assignee_group?.name ?? (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </SidebarField>

              {/* Reporter */}
              <SidebarField label={t('fields.reporter')}>
                <span className="text-sm">
                  {ticket.reporter?.display_name ?? (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </SidebarField>

              {/* Asset */}
              <SidebarField label={t('fields.asset')} showSeparator={false}>
                <span className="text-sm">
                  {ticket.asset ? (
                    <span className="font-mono text-xs">{ticket.asset.display_name}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </span>
              </SidebarField>
            </CardContent>
          </Card>

          {/* SLA Card */}
          <Card className={cn(isBreach && 'border-destructive/50')}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                SLA
                {isBreach && (
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* SLA Tier */}
              {ticket.sla_tier && (
                <SidebarField label={t('sla_tier')}>
                  <Badge variant="secondary" className="text-xs uppercase">
                    {ticket.sla_tier}
                  </Badge>
                </SidebarField>
              )}

              {/* SLA Response Due */}
              <SidebarField label={t('fields.sla_response_due')}>
                <span className="text-xs tabular-nums">
                  {ticket.sla_response_due
                    ? formatDate(ticket.sla_response_due, locale, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </span>
              </SidebarField>

              {/* SLA Resolve Due */}
              <SidebarField label={t('fields.sla_resolve_due')}>
                <span className="text-xs tabular-nums">
                  {ticket.sla_resolve_due
                    ? formatDate(ticket.sla_resolve_due, locale, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </span>
              </SidebarField>

              {/* SLA Breached */}
              <SidebarField label={t('fields.sla_breached')} showSeparator={false}>
                {isBreach ? (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs">
                    {t('sla_yes')}
                  </Badge>
                ) : (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    {t('sla_no')}
                  </span>
                )}
              </SidebarField>
            </CardContent>
          </Card>

          {/* Dates Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t('dates_title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SidebarField label={t('fields.created_at')}>
                <span className="text-xs tabular-nums">
                  {formatDate(ticket.created_at, locale)}
                </span>
              </SidebarField>

              <SidebarField label={t('fields.updated_at')}>
                <span className="text-xs tabular-nums">
                  {formatDate(ticket.updated_at, locale)}
                </span>
              </SidebarField>

              {ticket.resolved_at && (
                <SidebarField label={t('fields.resolved_at')}>
                  <span className="text-xs tabular-nums">
                    {formatDate(ticket.resolved_at, locale)}
                  </span>
                </SidebarField>
              )}

              {ticket.closed_at && (
                <SidebarField label={t('fields.closed_at')} showSeparator={false}>
                  <span className="text-xs tabular-nums">
                    {formatDate(ticket.closed_at, locale)}
                  </span>
                </SidebarField>
              )}

              {/* Source */}
              <SidebarField label={t('fields.source')} showSeparator={false}>
                <Badge variant="secondary" className="text-xs">
                  {t(`sources.${ticket.source}`)}
                </Badge>
              </SidebarField>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
