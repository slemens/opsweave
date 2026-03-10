import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  GitBranch,
  Plus,
  ExternalLink,
  CheckCircle2,
  XCircle,
  BookOpen,
  Link2,
  Unlink,
  Search,
  Bug,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
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
// AUDIT-FIX: M-15 — AlertDialog for status change confirmation
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  useTicket,
  useTicketComments,
  useTicketHistory,
  useChildTickets,
  useUpdateTicketStatus,
  useUpdateTicketPriority,
  useAssignTicket,
  useAddComment,
  useCategories,
  useCreateCategory,
  useUpdateTicket,
} from '@/api/tickets';
// AUDIT-FIX: M-09 — Import from domain-specific API modules
import { useGroups } from '@/api/groups';
import { useUsers } from '@/api/users';
import { useCustomers } from '@/api/customers';
import type { TicketCommentWithAuthor, HistoryWithUser, ChildTicketSummary } from '@/api/tickets';
import type { TicketStatus, TicketPriority } from '@opsweave/shared';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_IMPACTS, TICKET_URGENCIES, CHANGE_RISK_LIKELIHOODS, CHANGE_RISK_IMPACTS, CHANGE_RISK_MATRIX } from '@opsweave/shared';
import {
  useTicketWorkflow,
  useWorkflowTemplates,
  useInstantiateWorkflow,
  useCompleteWorkflowStep,
  useCancelWorkflowInstance,
} from '@/api/workflows';
import { AssetPickerDialog } from '@/components/AssetPickerDialog';
import type { WorkflowInstanceFull } from '@/api/workflows';
import { useKbArticles, useLinkArticleToTicket, useUnlinkArticleFromTicket } from '@/api/kb';
import type { KbArticle } from '@/api/kb';
import { Input } from '@/components/ui/input';
import { useSearchKnownErrors } from '@/api/known-errors';
import type { KnownErrorSearchResult } from '@/api/known-errors';
import {
  useDeclareMajorIncident,
  useResolveMajorIncident,
} from '@/api/escalation';

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

const riskLevelColors: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const riskLevelDotColors: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
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
          <span
            className="text-xs text-muted-foreground cursor-help"
            title={formatDate(comment.created_at, locale)}
          >
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
// Workflow Instance View
// ---------------------------------------------------------------------------

const stepTypeColors: Record<string, string> = {
  form: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  routing: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  condition: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  automatic: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const wfInstanceStatusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

interface WorkflowInstanceViewProps {
  instance: WorkflowInstanceFull;
  onCompleteStep: () => void;
  onCancel: () => void;
  tWf: (key: string, opts?: Record<string, unknown>) => string;
}

function WorkflowInstanceView({ instance, onCompleteStep, onCancel, tWf }: WorkflowInstanceViewProps) {
  const stepInstances = instance.step_instances ?? [];
  const completedCount = stepInstances.filter((si) => si.status === 'completed' || si.status === 'skipped').length;
  const totalCount = stepInstances.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const activeStep = stepInstances.find((si) => si.status === 'in_progress' || si.status === 'pending');
  const completedSteps = stepInstances.filter((si) => si.status === 'completed' || si.status === 'skipped');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{instance.template_name}</span>
          <Badge className={wfInstanceStatusColors[instance.status] ?? ''} variant="secondary">
            {tWf(`instance_statuses.${instance.status}`)}
          </Badge>
        </div>
        {instance.status === 'active' && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground h-7 text-xs">
            <XCircle className="mr-1 h-3.5 w-3.5" />
            {tWf('instances.cancel')}
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{tWf('instances.progress')}</span>
          <span>{completedCount}/{totalCount}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Active step */}
      {activeStep && instance.status === 'active' && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {tWf('instances.current_step')}
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{activeStep.step?.name}</span>
              {activeStep.step?.step_type && (
                <Badge className={stepTypeColors[activeStep.step.step_type] ?? ''} variant="secondary" style={{ fontSize: '11px' }}>
                  {tWf(`step_types.${activeStep.step.step_type}`)}
                </Badge>
              )}
            </div>
            <Button size="sm" onClick={onCompleteStep} className="shrink-0 h-7 text-xs">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              {tWf('instances.complete_step')}
            </Button>
          </div>
        </div>
      )}

      {/* Step history */}
      {completedSteps.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {tWf('instances.step_history')}
          </p>
          <div className="divide-y rounded-lg border">
            {completedSteps.map((si) => (
              <div key={si.id} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-sm">{si.step?.name}</span>
                </div>
                {si.completed_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(si.completed_at))}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('tickets');
  const { t: tCommon } = useTranslation();
  const { t: tWf } = useTranslation('workflows');
  const { t: tKb } = useTranslation('kb');
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith('de') ? 'de-DE' : 'en-US';

  const { data: ticketData, isLoading, isError, refetch } = useTicket(id ?? '');
  const { data: commentsData, isLoading: commentsLoading } = useTicketComments(id ?? '');
  const { data: historyData, isLoading: historyLoading } = useTicketHistory(id ?? '');
  const { data: childrenData, isLoading: childrenLoading } = useChildTickets(id ?? '', !!ticketData && (ticketData.child_ticket_count ?? 0) > 0);

  const updateStatus = useUpdateTicketStatus();
  const updatePriority = useUpdateTicketPriority();
  const assignTicket = useAssignTicket();
  const updateTicket = useUpdateTicket();
  const declareMajorMutation = useDeclareMajorIncident();
  const resolveMajorMutation = useResolveMajorIncident();
  const createCategory = useCreateCategory();
  const { data: groupsData } = useGroups();
  const { data: usersData } = useUsers();
  const { data: customersData } = useCustomers();
  const { data: categoriesData } = useCategories();
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  const ticket = ticketData;
  const comments = commentsData ?? [];
  const history = historyData ?? [];
  const children = childrenData ?? [];

  const groups = groupsData?.data ?? [];
  const users = usersData?.data ?? [];
  const customers = (customersData?.data ?? []).filter((c) => c.is_active);
  const categories = (categoriesData?.data ?? []).filter(
    (c) => c.is_active && (c.applies_to === 'all' || c.applies_to === ticket?.ticket_type),
  );

  // ── Knowledge Base ─────────────────────────────────────────
  const [kbSearch, setKbSearch] = useState('');
  const [kbDebouncedSearch, setKbDebouncedSearch] = useState('');
  const [viewingKbArticle, setViewingKbArticle] = useState<KbArticle | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setKbDebouncedSearch(kbSearch), 400);
    return () => clearTimeout(timer);
  }, [kbSearch]);

  // Articles linked to this ticket
  const { data: linkedArticlesData, isLoading: linkedArticlesLoading } = useKbArticles(
    id ? { linked_ticket_id: id, limit: 50 } : undefined,
  );
  const linkedArticles: KbArticle[] = linkedArticlesData?.data ?? [];

  // Search results for linking (only when query given)
  const { data: searchArticlesData, isLoading: searchLoading } = useKbArticles(
    kbDebouncedSearch ? { q: kbDebouncedSearch, status: 'published', limit: 10 } : undefined,
  );
  const searchArticles: KbArticle[] = searchArticlesData?.data ?? [];

  const linkArticleMutation = useLinkArticleToTicket();
  const unlinkArticleMutation = useUnlinkArticleFromTicket();

  const handleLinkArticle = useCallback(async (articleId: string) => {
    if (!id) return;
    try {
      await linkArticleMutation.mutateAsync({ articleId, ticketId: id });
      toast.success(tKb('link_ticket'));
    } catch {
      toast.error(tKb('ticket_tab.link_error'));
    }
  }, [id, linkArticleMutation, tKb]);

  const handleUnlinkArticle = useCallback(async (articleId: string) => {
    if (!id) return;
    try {
      await unlinkArticleMutation.mutateAsync({ articleId, ticketId: id });
    } catch {
      toast.error(tKb('ticket_tab.unlink_error'));
    }
  }, [id, unlinkArticleMutation, tKb]);

  // ── Change RFC field handlers ───────────────────────────────
  const handleChangeFieldUpdate = useCallback(async (field: string, value: string | null) => {
    if (!id) return;
    try {
      await updateTicket.mutateAsync({ id, [field]: value });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateTicket, t]);

  // ── Known Error (Incidents) ─────────────────────────────────
  const [keSearch, setKeSearch] = useState('');
  const [keDebouncedSearch, setKeDebouncedSearch] = useState('');
  const [keDropdownOpen, setKeDropdownOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setKeDebouncedSearch(keSearch), 400);
    return () => clearTimeout(timer);
  }, [keSearch]);

  const { data: keSearchResults } = useSearchKnownErrors(keDebouncedSearch);
  const keResults: KnownErrorSearchResult[] = keSearchResults ?? [];

  const handleKnownErrorSelect = useCallback(async (keId: string | null) => {
    if (!id) return;
    try {
      await updateTicket.mutateAsync({ id, known_error_id: keId });
      toast.success(t('update_success'));
      setKeSearch('');
      setKeDropdownOpen(false);
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateTicket, t]);

  // ── Workflow ───────────────────────────────────────────────
  const { data: workflowInstance, isLoading: workflowLoading } = useTicketWorkflow(id);
  const { data: templatesData } = useWorkflowTemplates({ is_active: 'true', limit: 50 });
  const instantiateMutation = useInstantiateWorkflow();
  const completeStepMutation = useCompleteWorkflowStep();
  const cancelInstanceMutation = useCancelWorkflowInstance();

  const [startWfOpen, setStartWfOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [completeStepOpen, setCompleteStepOpen] = useState(false);
  const [cancelWfOpen, setCancelWfOpen] = useState(false);

  const availableTemplates = templatesData?.data ?? [];

  const handleStartWorkflow = useCallback(async () => {
    if (!id || !selectedTemplateId) return;
    try {
      await instantiateMutation.mutateAsync({ template_id: selectedTemplateId, ticket_id: id });
      toast.success(tWf('instantiate_success'));
      setStartWfOpen(false);
      setSelectedTemplateId('');
    } catch {
      toast.error(tWf('instantiate_error'));
    }
  }, [id, selectedTemplateId, instantiateMutation, tWf]);

  const handleCompleteStep = useCallback(async () => {
    if (!workflowInstance) return;
    const activeStep = workflowInstance.step_instances?.find((si) => si.status === 'in_progress' || si.status === 'pending');
    if (!activeStep) return;
    try {
      await completeStepMutation.mutateAsync({
        instanceId: workflowInstance.id,
        stepInstanceId: activeStep.id,
        form_data: {},
      });
      toast.success(tWf('complete_step_success'));
      setCompleteStepOpen(false);
    } catch {
      toast.error(tWf('complete_step_error'));
    }
  }, [workflowInstance, completeStepMutation, tWf]);

  const handleCancelWorkflow = useCallback(async () => {
    if (!workflowInstance) return;
    try {
      await cancelInstanceMutation.mutateAsync(workflowInstance.id);
      toast.success(tWf('cancel_success'));
      setCancelWfOpen(false);
    } catch {
      toast.error(tWf('cancel_error'));
    }
  }, [workflowInstance, cancelInstanceMutation, tWf]);

  const handleAssigneeChange = useCallback(async (userId: string) => {
    if (!id) return;
    try {
      await assignTicket.mutateAsync({
        id,
        assignee_id: userId === '__none__' ? null : userId,
        assignee_group_id: ticket?.assignee_group_id ?? null,
      });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, assignTicket, ticket?.assignee_group_id, t]);

  const handleGroupChange = useCallback(async (groupId: string) => {
    if (!id) return;
    try {
      await assignTicket.mutateAsync({
        id,
        assignee_id: ticket?.assignee_id ?? null,
        assignee_group_id: groupId === '__none__' ? null : groupId,
      });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, assignTicket, ticket?.assignee_id, t]);

  const handleCustomerChange = useCallback(async (custId: string) => {
    if (!id) return;
    try {
      await updateTicket.mutateAsync({
        id,
        customer_id: custId === '__none__' ? null : custId,
      });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateTicket, t]);

  // ── New Category creation state ────────────────────────────
  const [newCatDialogOpen, setNewCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // AUDIT-FIX: M-15 — Confirmation dialog state for critical status changes
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleCategoryChange = useCallback(async (catId: string) => {
    if (catId === '__create_new__') {
      setNewCatName('');
      setNewCatDialogOpen(true);
      return;
    }
    if (!id) return;
    try {
      await updateTicket.mutateAsync({
        id,
        category_id: catId === '__none__' ? null : catId,
      });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateTicket, t]);

  const handleCreateCategory = useCallback(async () => {
    if (!id || !newCatName.trim()) return;
    try {
      const created = await createCategory.mutateAsync({
        name: newCatName.trim(),
        applies_to: ticket?.ticket_type ?? 'all',
      });
      // Assign the newly created category to this ticket
      await updateTicket.mutateAsync({ id, category_id: created.id });
      toast.success(t('category_created'));
      setNewCatDialogOpen(false);
      setNewCatName('');
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, newCatName, createCategory, updateTicket, ticket?.ticket_type, t]);

  const handleAssetChange = useCallback(async (assetId: string | null) => {
    if (!id) return;
    try {
      await updateTicket.mutateAsync({
        id,
        asset_id: assetId,
      });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateTicket, t]);

  // AUDIT-FIX: M-15 — Confirmation dialog for critical status transitions
  const CONFIRM_STATUSES = ['closed', 'resolved', 'archived'];

  const handleStatusChange = useCallback((newStatus: string) => {
    if (!id) return;
    if (CONFIRM_STATUSES.includes(newStatus)) {
      setPendingStatus(newStatus);
      setStatusConfirmOpen(true);
      return;
    }
    void doStatusChange(newStatus);
  }, [id]);

  const doStatusChange = useCallback(async (newStatus: string) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ id, status: newStatus as TicketStatus });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateStatus, t]);

  const handleStatusConfirm = useCallback(() => {
    if (pendingStatus) {
      void doStatusChange(pendingStatus);
    }
    setStatusConfirmOpen(false);
    setPendingStatus(null);
  }, [pendingStatus, doStatusChange]);

  const handleImpactChange = useCallback(async (value: string) => {
    if (!id) return;
    try {
      await updateTicket.mutateAsync({
        id,
        impact: value === '__none__' ? null : value,
      });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateTicket, t]);

  const handleUrgencyChange = useCallback(async (value: string) => {
    if (!id) return;
    try {
      await updateTicket.mutateAsync({
        id,
        urgency: value === '__none__' ? null : value,
      });
      toast.success(t('update_success'));
    } catch {
      toast.error(t('update_error'));
    }
  }, [id, updateTicket, t]);

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

      {/* Major Incident Banner */}
      {ticket.is_major_incident === 1 && (
        <div className="flex items-center gap-3 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3 dark:bg-red-950/30">
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              {t('major_incident.banner')}
            </p>
            {ticket.bridge_call_url && (
              <a
                href={ticket.bridge_call_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-600 underline hover:text-red-800 dark:text-red-400"
              >
                {t('major_incident.bridge_call')} <ExternalLink className="inline h-3 w-3" />
              </a>
            )}
          </div>
          {ticket.incident_commander_id && (
            <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-400">
              {t('major_incident.commander')}: {ticket.incident_commander_id}
            </Badge>
          )}
        </div>
      )}

      {/* Escalation Level Indicator */}
      {ticket.escalation_level > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            {t('escalation.title')} — {t('escalation.level')} {ticket.escalation_level}
          </span>
          {ticket.escalated_at && (
            <span className="text-xs text-amber-600 dark:text-amber-500">
              ({formatDate(ticket.escalated_at)})
            </span>
          )}
        </div>
      )}

      {/* Parent Ticket Link */}
      {ticket.parent_ticket && (
        <div className="flex items-center gap-2 text-sm bg-muted/50 border rounded-lg px-3 py-2">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">{t('parent_child.linked_to_parent')}</span>
          <Link
            to={`/tickets/${ticket.parent_ticket.id}`}
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            <Badge variant="outline" className="font-mono text-xs">
              {ticket.parent_ticket.ticket_number}
            </Badge>
            <span className="truncate max-w-[300px]">{ticket.parent_ticket.title}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        </div>
      )}

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

          {/* Root Cause Analysis (Problem tickets only) */}
          {ticket.ticket_type === 'problem' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('root_cause_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                {ticket.root_cause ? (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                    {ticket.root_cause}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {t('root_cause_empty')}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* RFC Details (Change tickets only) */}
          {ticket.ticket_type === 'change' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('rfc.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Risk Assessment Matrix */}
                <div>
                  <h4 className="text-sm font-medium mb-3">{t('rfc.risk_matrix_title')}</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('rfc.risk_likelihood')}</Label>
                        <Select
                          value={ticket.change_risk_likelihood ?? '__none__'}
                          onValueChange={(v) => void handleChangeFieldUpdate('change_risk_likelihood', v === '__none__' ? null : v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__"><span className="text-muted-foreground">-</span></SelectItem>
                            {CHANGE_RISK_LIKELIHOODS.map((l) => (
                              <SelectItem key={l} value={l}>{t(`rfc.likelihoods.${l}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{t('rfc.risk_impact')}</Label>
                        <Select
                          value={ticket.change_risk_impact ?? '__none__'}
                          onValueChange={(v) => void handleChangeFieldUpdate('change_risk_impact', v === '__none__' ? null : v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__"><span className="text-muted-foreground">-</span></SelectItem>
                            {CHANGE_RISK_IMPACTS.map((i) => (
                              <SelectItem key={i} value={i}>{t(`rfc.impacts.${i}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* 4×4 Risk Matrix Grid */}
                    <div className="rounded-lg border overflow-hidden">
                      <div className="grid grid-cols-5 text-[10px] font-medium">
                        <div className="p-1.5 bg-muted/50" />
                        {CHANGE_RISK_IMPACTS.map((imp) => (
                          <div key={imp} className="p-1.5 bg-muted/50 text-center text-muted-foreground">
                            {t(`rfc.impacts.${imp}`)}
                          </div>
                        ))}
                        {CHANGE_RISK_LIKELIHOODS.map((lik) => (
                          <>
                            <div key={`label-${lik}`} className="p-1.5 bg-muted/50 text-muted-foreground flex items-center">
                              {t(`rfc.likelihoods.${lik}`)}
                            </div>
                            {CHANGE_RISK_IMPACTS.map((imp) => {
                              const cellRisk = CHANGE_RISK_MATRIX[lik]?.[imp] ?? 'medium';
                              const isActive = ticket.change_risk_likelihood === lik && ticket.change_risk_impact === imp;
                              return (
                                <button
                                  key={`${lik}-${imp}`}
                                  type="button"
                                  className={cn(
                                    'p-1.5 text-center text-[10px] font-medium transition-all border-r border-b last:border-r-0',
                                    riskLevelColors[cellRisk],
                                    isActive && 'ring-2 ring-primary ring-inset font-bold',
                                    !isActive && 'opacity-60 hover:opacity-100',
                                  )}
                                  onClick={() => {
                                    void handleChangeFieldUpdate('change_risk_likelihood', lik);
                                    void handleChangeFieldUpdate('change_risk_impact', imp);
                                  }}
                                >
                                  {t(`rfc.risk_levels.${cellRisk}`)}
                                </button>
                              );
                            })}
                          </>
                        ))}
                      </div>
                    </div>
                    {ticket.change_risk_level && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t('rfc.risk_level')}:</span>
                        <Badge variant="outline" className={cn('text-xs', riskLevelColors[ticket.change_risk_level])}>
                          <span className={cn('mr-1.5 h-2 w-2 rounded-full', riskLevelDotColors[ticket.change_risk_level])} />
                          {t(`rfc.risk_levels.${ticket.change_risk_level}`)}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Justification */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('rfc.justification')}</Label>
                  <Textarea
                    value={ticket.change_justification ?? ''}
                    placeholder={t('rfc.justification_placeholder')}
                    rows={3}
                    className="resize-none text-sm"
                    onBlur={(e) => {
                      const val = e.target.value.trim() || null;
                      if (val !== (ticket.change_justification ?? null)) {
                        void handleChangeFieldUpdate('change_justification', val);
                      }
                    }}
                    defaultValue={ticket.change_justification ?? ''}
                  />
                </div>

                {/* Implementation Plan */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('rfc.implementation')}</Label>
                  <Textarea
                    placeholder={t('rfc.implementation_placeholder')}
                    rows={3}
                    className="resize-none text-sm"
                    defaultValue={ticket.change_implementation ?? ''}
                    onBlur={(e) => {
                      const val = e.target.value.trim() || null;
                      if (val !== (ticket.change_implementation ?? null)) {
                        void handleChangeFieldUpdate('change_implementation', val);
                      }
                    }}
                  />
                </div>

                {/* Rollback Plan */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('rfc.rollback_plan')}</Label>
                  <Textarea
                    placeholder={t('rfc.rollback_placeholder')}
                    rows={3}
                    className="resize-none text-sm"
                    defaultValue={ticket.change_rollback_plan ?? ''}
                    onBlur={(e) => {
                      const val = e.target.value.trim() || null;
                      if (val !== (ticket.change_rollback_plan ?? null)) {
                        void handleChangeFieldUpdate('change_rollback_plan', val);
                      }
                    }}
                  />
                </div>

                <Separator />

                {/* Planned Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('rfc.planned_start')}</Label>
                    <Input
                      type="datetime-local"
                      className="h-8 text-xs"
                      defaultValue={ticket.change_planned_start ? ticket.change_planned_start.slice(0, 16) : ''}
                      onBlur={(e) => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                        void handleChangeFieldUpdate('change_planned_start', val);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('rfc.planned_end')}</Label>
                    <Input
                      type="datetime-local"
                      className="h-8 text-xs"
                      defaultValue={ticket.change_planned_end ? ticket.change_planned_end.slice(0, 16) : ''}
                      onBlur={(e) => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                        void handleChangeFieldUpdate('change_planned_end', val);
                      }}
                    />
                  </div>
                </div>

                {/* Actual Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('rfc.actual_start')}</Label>
                    <Input
                      type="datetime-local"
                      className="h-8 text-xs"
                      defaultValue={ticket.change_actual_start ? ticket.change_actual_start.slice(0, 16) : ''}
                      onBlur={(e) => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                        void handleChangeFieldUpdate('change_actual_start', val);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('rfc.actual_end')}</Label>
                    <Input
                      type="datetime-local"
                      className="h-8 text-xs"
                      defaultValue={ticket.change_actual_end ? ticket.change_actual_end.slice(0, 16) : ''}
                      onBlur={(e) => {
                        const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                        void handleChangeFieldUpdate('change_actual_end', val);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Child Tickets */}
          {((ticket.child_ticket_count ?? 0) > 0 || children.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    {t('parent_child.children')}
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                      {children.length}
                    </Badge>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => navigate(`/tickets?parent=${id}&type=${ticket.ticket_type}`)}
                  >
                    <Plus className="mr-1.5 h-3 w-3" />
                    {t('parent_child.create_child')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {childrenLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : children.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('parent_child.no_children')}</p>
                ) : (
                  <div className="divide-y">
                    {children.map((child: ChildTicketSummary) => (
                      <Link
                        key={child.id}
                        to={`/tickets/${child.id}`}
                        className="flex items-center gap-3 py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                      >
                        <Badge
                          variant="outline"
                          className={cn('font-mono text-[10px] shrink-0', ticketTypeBadgeColors[child.ticket_type])}
                        >
                          {child.ticket_number}
                        </Badge>
                        <span className="text-sm truncate flex-1">{child.title}</span>
                        <Badge className={cn('text-[10px] shrink-0', statusColors[child.status as TicketStatus])}>
                          {t(`statuses.${child.status}`)}
                        </Badge>
                        <span className={cn('h-2 w-2 rounded-full shrink-0', priorityDotColors[child.priority as TicketPriority])} />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create Child Button (when no children yet) */}
          {(ticket.child_ticket_count ?? 0) === 0 && children.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/tickets?parent=${id}&type=${ticket.ticket_type}`)}
            >
              <GitBranch className="mr-2 h-3.5 w-3.5" />
              {t('parent_child.create_child')}
            </Button>
          )}

          {/* Tabs: Comments / History / Workflow / KB */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
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
              <TabsTrigger value="workflow" className="gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                {tWf('title')}
                {workflowInstance?.status === 'active' && (
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 bg-blue-100 text-blue-700">
                    {tWf('instance_statuses.active')}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="kb" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {tKb('ticket_tab.title')}
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

            {/* Workflow Tab */}
            <TabsContent value="workflow">
              <Card>
                <CardContent className="pt-4">
                  {workflowLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ) : !workflowInstance ? (
                    /* No active instance */
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <GitBranch className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm font-medium mb-1">{tWf('instances.no_active')}</p>
                      <p className="text-sm text-muted-foreground mb-4">{tWf('instances.no_active_hint')}</p>
                      <Button size="sm" onClick={() => setStartWfOpen(true)} disabled={availableTemplates.length === 0}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        {tWf('instances.start')}
                      </Button>
                    </div>
                  ) : (
                    /* Active instance */
                    <WorkflowInstanceView
                      instance={workflowInstance}
                      onCompleteStep={() => setCompleteStepOpen(true)}
                      onCancel={() => setCancelWfOpen(true)}
                      tWf={tWf}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* KB Tab */}
            <TabsContent value="kb">
              <Card>
                <CardContent className="pt-4 space-y-5">
                  {/* Linked articles */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {tKb('ticket_tab.linked_articles')}
                    </h3>
                    {linkedArticlesLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                      </div>
                    ) : linkedArticles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <BookOpen className="h-7 w-7 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">{tKb('ticket_tab.no_linked_articles')}</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{tKb('ticket_tab.no_linked_hint')}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border rounded-lg border border-border">
                        {linkedArticles.map((article) => (
                          <div key={article.id} className="flex items-center gap-3 px-3 py-2.5">
                            <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <button
                                type="button"
                                className="text-sm font-medium truncate text-primary hover:underline text-left"
                                onClick={() => setViewingKbArticle(article)}
                              >
                                {article.title}
                              </button>
                              {article.category && (
                                <p className="text-xs text-muted-foreground">{article.category}</p>
                              )}
                            </div>
                            <Badge variant={article.visibility === 'public' ? 'default' : 'secondary'} className="text-xs shrink-0">
                              {tKb(`visibility.${article.visibility}`)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                              title={tKb('ticket_tab.unlink')}
                              onClick={() => void handleUnlinkArticle(article.id)}
                              disabled={unlinkArticleMutation.isPending}
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Search to link articles */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {tKb('ticket_tab.search_to_link')}
                    </h3>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={kbSearch}
                        onChange={(e) => setKbSearch(e.target.value)}
                        placeholder={tKb('ticket_tab.search_placeholder')}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>

                    {kbDebouncedSearch && (
                      searchLoading ? (
                        <div className="space-y-2">
                          {[1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
                        </div>
                      ) : searchArticles.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {tKb('no_articles')}
                        </p>
                      ) : (
                        <div className="divide-y divide-border rounded-lg border border-border">
                          {searchArticles.map((article) => {
                            const isLinked = linkedArticles.some((a) => a.id === article.id);
                            return (
                              <div key={article.id} className="flex items-center gap-3 px-3 py-2.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{article.title}</p>
                                  {article.category && (
                                    <p className="text-xs text-muted-foreground">{article.category}</p>
                                  )}
                                </div>
                                {isLinked ? (
                                  <Badge variant="secondary" className="text-xs shrink-0">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Linked
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs shrink-0"
                                    onClick={() => void handleLinkArticle(article.id)}
                                    disabled={linkArticleMutation.isPending}
                                  >
                                    <Link2 className="mr-1 h-3 w-3" />
                                    {tKb('ticket_tab.link')}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Start Workflow Dialog */}
          <Dialog open={startWfOpen} onOpenChange={setStartWfOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{tWf('instances.start')}</DialogTitle>
                <DialogDescription>{tWf('instances.select_template')}</DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder={tWf('instances.select_template')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStartWfOpen(false)}>{tCommon('actions.cancel')}</Button>
                <Button onClick={handleStartWorkflow} disabled={!selectedTemplateId || instantiateMutation.isPending}>
                  {tWf('instances.start')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Complete Step Dialog */}
          <Dialog open={completeStepOpen} onOpenChange={setCompleteStepOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{tWf('instances.complete_step')}</DialogTitle>
                <DialogDescription>{tWf('complete_step_success')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCompleteStepOpen(false)}>{tCommon('actions.cancel')}</Button>
                <Button onClick={handleCompleteStep} disabled={completeStepMutation.isPending}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {tWf('instances.complete_step')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Cancel Workflow Dialog */}
          <Dialog open={cancelWfOpen} onOpenChange={setCancelWfOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{tWf('instances.cancel')}</DialogTitle>
                <DialogDescription>{tWf('delete_confirm_detail')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelWfOpen(false)}>{tCommon('actions.cancel')}</Button>
                <Button variant="destructive" onClick={handleCancelWorkflow} disabled={cancelInstanceMutation.isPending}>
                  <XCircle className="mr-1.5 h-4 w-4" />
                  {tWf('instances.cancel')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

              {/* Impact */}
              <SidebarField label={t('fields.impact')}>
                <Select
                  value={ticket.impact ?? '__none__'}
                  onValueChange={handleImpactChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">-</span>
                    </SelectItem>
                    {TICKET_IMPACTS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {t(`impacts.${v}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarField>

              {/* Urgency */}
              <SidebarField label={t('fields.urgency')}>
                <Select
                  value={ticket.urgency ?? '__none__'}
                  onValueChange={handleUrgencyChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">-</span>
                    </SelectItem>
                    {TICKET_URGENCIES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {t(`urgencies.${v}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarField>

              {/* Priority */}
              <SidebarField label={t('fields.priority')}>
                {ticket.impact && ticket.urgency ? (
                  <div className="space-y-1">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', priorityColors[ticket.priority])}
                    >
                      <span className={cn('mr-1.5 h-2 w-2 rounded-full', priorityDotColors[ticket.priority])} />
                      {t(`priorities.${ticket.priority}`)}
                    </Badge>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {t('priority_auto_calculated')}
                    </p>
                  </div>
                ) : (
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
                )}
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
                <Select
                  value={ticket.assignee_id ?? '__none__'}
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('unassigned')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground italic">{t('unassigned')}</span>
                    </SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarField>

              {/* Group */}
              <SidebarField label={t('fields.group')}>
                <Select
                  value={ticket.assignee_group_id ?? '__none__'}
                  onValueChange={handleGroupChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">-</span>
                    </SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <SidebarField label={t('detail_fields.asset')}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-start text-xs font-normal"
                  onClick={() => setAssetPickerOpen(true)}
                >
                  {ticket.asset?.display_name ?? (
                    <span className="text-muted-foreground italic">{t('detail_fields.no_asset')}</span>
                  )}
                </Button>
                <AssetPickerDialog
                  open={assetPickerOpen}
                  onOpenChange={setAssetPickerOpen}
                  currentAssetId={ticket.asset_id}
                  onSelect={handleAssetChange}
                />
              </SidebarField>

              {/* Customer */}
              <SidebarField label={t('fields.customer')}>
                <Select
                  value={ticket.customer_id ?? '__none__'}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('no_customer')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground italic">{t('no_customer')}</span>
                    </SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarField>

              {/* Category */}
              <SidebarField label={t('fields.category')}>
                <Select
                  value={ticket.category_id ?? '__none__'}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={t('no_category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground italic">{t('no_category')}</span>
                    </SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__create_new__">
                      <span className="flex items-center gap-1 text-primary">
                        <Plus className="h-3 w-3" />
                        {t('create_category')}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </SidebarField>

              {/* Parent Ticket */}
              <SidebarField label={t('fields.parent_ticket')} showSeparator={!!ticket.parent_ticket_id}>
                {ticket.parent_ticket ? (
                  <Link
                    to={`/tickets/${ticket.parent_ticket.id}`}
                    className="text-xs font-mono text-primary hover:underline"
                  >
                    {ticket.parent_ticket.ticket_number}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </SidebarField>

              {/* Child Tickets Count */}
              {(ticket.child_ticket_count ?? 0) > 0 && (
                <SidebarField label={t('fields.child_tickets')} showSeparator={false}>
                  <Badge variant="secondary" className="text-xs">
                    {t('parent_child.child_count', { count: ticket.child_ticket_count })}
                  </Badge>
                </SidebarField>
              )}
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

              {/* SLA Paused Indicator */}
              {ticket.sla_paused_at && (
                <SidebarField label={t('sla_paused_label')}>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs">
                    {t('sla_paused')}
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

          {/* Known Error Card (Incidents only) */}
          {ticket.ticket_type === 'incident' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  {t('known_error_title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Currently linked known error with workaround */}
                {ticket.known_error_id && ticket.known_error ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to="/known-errors"
                          className="text-sm font-medium truncate text-primary hover:underline"
                        >
                          {ticket.known_error.title}
                        </Link>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        title={tCommon('actions.remove')}
                        onClick={() => void handleKnownErrorSelect(null)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {ticket.known_error.workaround && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                            {t('known_error_workaround')}
                          </span>
                        </div>
                        <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                          {ticket.known_error.workaround}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t('known_error_none')}</p>
                    {/* Search to link */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={keSearch}
                        onChange={(e) => {
                          setKeSearch(e.target.value);
                          setKeDropdownOpen(true);
                        }}
                        onFocus={() => setKeDropdownOpen(true)}
                        placeholder={t('kedb_search')}
                        className="pl-7 h-7 text-xs"
                      />
                    </div>
                    {keDropdownOpen && keDebouncedSearch.length >= 2 && (
                      <div className="rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
                        {keResults.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-3 text-center">
                            {t('kedb_empty')}
                          </p>
                        ) : (
                          keResults.map((ke) => (
                            <button
                              key={ke.id}
                              type="button"
                              className="flex flex-col w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-b-0"
                              onClick={() => void handleKnownErrorSelect(ke.id)}
                            >
                              <span className="text-sm font-medium truncate">{ke.title}</span>
                              {ke.workaround && (
                                <span className="text-xs text-muted-foreground truncate mt-0.5">
                                  {t('known_error_workaround')}: {ke.workaround.slice(0, 80)}
                                  {ke.workaround.length > 80 ? '…' : ''}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Escalation & Major Incident Actions */}
          {ticket.ticket_type === 'incident' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  {t('escalation.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Escalation info */}
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('escalation.level')}:</span>{' '}
                  <span className="font-medium">
                    {ticket.escalation_level > 0
                      ? `Level ${ticket.escalation_level}`
                      : t('escalation.no_escalation')}
                  </span>
                </div>

                {/* Major Incident toggle */}
                {ticket.is_major_incident !== 1 ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (confirm(t('major_incident.declare_confirm'))) {
                        declareMajorMutation.mutate(
                          { ticketId: ticket.id },
                          {
                            onSuccess: () => toast.success(t('major_incident.declared_success')),
                          },
                        );
                      }
                    }}
                    disabled={declareMajorMutation.isPending}
                  >
                    <ShieldAlert className="mr-1 h-4 w-4" />
                    {t('major_incident.declare')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (confirm(t('major_incident.resolve_confirm'))) {
                        resolveMajorMutation.mutate(ticket.id, {
                          onSuccess: () => toast.success(t('major_incident.resolved_success')),
                        });
                      }
                    }}
                    disabled={resolveMajorMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    {t('major_incident.resolve')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

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

      {/* ── New Category Dialog ─────────────────────────────── */}
      <Dialog open={newCatDialogOpen} onOpenChange={setNewCatDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('create_category')}</DialogTitle>
            <DialogDescription>{t('create_category_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{t('fields.name')}</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder={t('category_name_placeholder')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCatDialogOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCatName.trim() || createCategory.isPending}
            >
              {createCategory.isPending ? t('creating') : tCommon('actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AUDIT-FIX: M-15 — Confirmation dialog for critical status changes */}
      <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('status_confirm_title', { status: pendingStatus ? t(`statuses.${pendingStatus}`) : '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('status_confirm_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatus(null)}>
              {tCommon('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusConfirm}>
              {tCommon('actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* KB Article Viewer Dialog */}
      <Dialog open={viewingKbArticle !== null} onOpenChange={(open) => { if (!open) setViewingKbArticle(null); }}>
        {viewingKbArticle && (
          <DialogContent className="sm:max-w-2xl flex flex-col max-h-[85vh]">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-lg font-semibold leading-snug pr-6">
                {viewingKbArticle.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {viewingKbArticle.category && (
                    <Badge variant="outline" className="text-xs">
                      {viewingKbArticle.category}
                    </Badge>
                  )}
                  <Badge variant={viewingKbArticle.visibility === 'public' ? 'default' : 'secondary'} className="text-xs">
                    {tKb(`visibility.${viewingKbArticle.visibility}`)}
                  </Badge>
                </div>
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <div className="flex-1 overflow-y-auto min-h-0 py-2">
              <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:whitespace-pre-wrap [&_code]:break-all [&_pre]:overflow-hidden">
                <ReactMarkdown>{viewingKbArticle.content || '*—*'}</ReactMarkdown>
              </div>
            </div>
            <Separator />
            <DialogFooter className="shrink-0">
              <Button variant="outline" onClick={() => setViewingKbArticle(null)}>
                {tCommon('actions.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
