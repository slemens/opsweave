import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Send,
  MessageSquare,
  Loader2,
  Clock,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { portalApi } from '@/api/portal';
import type { PortalTicket, PortalComment } from '@/api/portal';
import { formatDate, formatRelativeTime } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status & Priority display helpers
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
  return <Badge variant={variantMap[status]}>{t(`status.${status}`)}</Badge>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const { t } = useTranslation('portal');
  const variantMap: Record<TicketPriority, 'secondary' | 'warning' | 'destructive' | 'outline'> = {
    low: 'secondary',
    medium: 'outline',
    high: 'warning',
    critical: 'destructive',
  };
  return <Badge variant={variantMap[priority]}>{t(`priority.${priority}`)}</Badge>;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comment component
// ---------------------------------------------------------------------------

interface CommentItemProps {
  comment: PortalComment;
}

function CommentItem({ comment }: CommentItemProps) {
  const { t } = useTranslation('portal');
  const isCustomer = comment.source === 'customer';
  const isSystem = comment.source === 'system';

  const authorName =
    comment.author?.displayName ??
    (isCustomer ? t('ticket.author_you') : t('ticket.author_support'));
  const initials = authorName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isSystem) {
    return (
      <div className="flex items-start gap-2 py-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
          <Clock className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs italic text-muted-foreground">{comment.content}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60" title={formatDate(comment.createdAt)}>
            {formatRelativeTime(comment.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isCustomer ? 'flex-row-reverse' : ''}`}>
      <Avatar className="mt-0.5 h-8 w-8 shrink-0">
        <AvatarFallback
          className={`text-xs font-semibold ${
            isCustomer
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {initials || <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={`max-w-[80%] space-y-1 ${isCustomer ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-foreground">{authorName}</span>
          <span
            className="text-xs text-muted-foreground"
            title={formatDate(comment.createdAt)}
          >
            {formatRelativeTime(comment.createdAt)}
          </span>
        </div>
        <div
          className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
            isCustomer
              ? 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm bg-muted text-foreground'
          }`}
        >
          {comment.content}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function PortalTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('portal');

  const [ticket, setTicket] = useState<PortalTicket | null>(null);
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [isLoadingTicket, setIsLoadingTicket] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const loadTicket = async () => {
    if (!id) return;
    setIsLoadingTicket(true);
    setTicketError(null);
    try {
      const data = await portalApi.getTicket(id);
      setTicket(data);
    } catch (err) {
      setTicketError(err instanceof Error ? err.message : t('ticket.error_load'));
    } finally {
      setIsLoadingTicket(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;
    setIsLoadingComments(true);
    setCommentsError(null);
    try {
      const data = await portalApi.listComments(id);
      setComments(data);
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : t('ticket.comments_error'));
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    void loadTicket();
    void loadComments();
  }, [id]);

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;

    setCommentError(null);
    setIsSubmittingComment(true);

    try {
      const comment = await portalApi.addComment(id, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : t('ticket.comment_error'));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: error loading ticket
  // ---------------------------------------------------------------------------

  if (!isLoadingTicket && ticketError) {
    return (
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2 text-muted-foreground"
          onClick={() => navigate('/portal/tickets')}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {t('ticket.back')}
        </Button>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{ticketError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadTicket()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: main
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6" data-testid="page-portal-ticket-detail">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/portal/tickets')}
        data-testid="btn-back-portal-tickets"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        {t('ticket.back')}
      </Button>

      {/* ------------------------------------------------------------------ */}
      {/* Ticket details card                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Card className="shadow-sm" data-testid="card-portal-ticket-detail">
        <CardHeader className="pb-4">
          {isLoadingTicket ? (
            <DetailSkeleton />
          ) : ticket ? (
            <>
              {/* Ticket number + title */}
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  {ticket.ticketNumber}
                </span>
                <CardTitle className="text-xl font-bold leading-snug">{ticket.title}</CardTitle>
              </div>

              {/* Meta badges */}
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{t('ticket.field_status')}</span>
                  <StatusBadge status={ticket.status} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{t('ticket.field_priority')}</span>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{t('ticket.field_type')}</span>
                  <Badge variant="secondary">{t(`ticket_type.${ticket.ticketType}`)}</Badge>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{t('ticket.field_created')}</span>
                  <span className="text-sm text-foreground" title={formatDate(ticket.createdAt)}>
                    {formatDate(ticket.createdAt, 'de-DE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </CardHeader>

        {ticket?.description && (
          <>
            <Separator />
            <CardContent className="pt-4">
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('ticket.description')}
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {ticket.description}
                </p>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Comments section                                                    */}
      {/* ------------------------------------------------------------------ */}
      <Card className="shadow-sm" data-testid="card-portal-comments">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            {t('ticket.comments_title')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Comments list */}
          {isLoadingComments ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : commentsError ? (
            <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{commentsError}</p>
              <Button variant="ghost" size="sm" onClick={() => void loadComments()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t('ticket.comments_empty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment, i) => (
                <CommentItem key={comment.id ?? i} comment={comment} />
              ))}
            </div>
          )}

          {/* Add comment form — only show if ticket is not closed */}
          {ticket && ticket.status !== 'closed' && (
            <>
              <Separator className="my-2" />
              <form onSubmit={handleSubmitComment} className="space-y-3" data-testid="form-portal-comment">
                {commentError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {commentError}
                  </div>
                )}
                <Textarea
                  placeholder={t('ticket.comment_placeholder')}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={isSubmittingComment}
                  rows={3}
                  className="resize-none"
                  data-testid="input-portal-comment"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmittingComment || !newComment.trim()}
                    data-testid="btn-send-portal-comment"
                  >
                    {isSubmittingComment ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        {t('ticket.comment_sending')}
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-3.5 w-3.5" />
                        {t('ticket.comment_send')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Closed ticket note */}
          {ticket?.status === 'closed' && (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
              {t('ticket.closed_note')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
