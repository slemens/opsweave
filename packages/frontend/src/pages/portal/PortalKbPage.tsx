import { useState, useEffect, useCallback } from 'react';
import { Search, BookOpen, AlertCircle, RefreshCw, X, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { portalApi } from '@/api/portal';
import type { PortalKbArticle } from '@/api/portal';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function KbSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Article card
// ---------------------------------------------------------------------------

interface ArticleCardProps {
  article: PortalKbArticle;
  onOpen: (article: PortalKbArticle) => void;
}

function ArticleCard({ article, onOpen }: ArticleCardProps) {
  const { t } = useTranslation('portal');

  // Extract first ~120 chars of plain text from markdown
  const preview = article.content
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*|__|\*|_|`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 120);

  return (
    <Card
      className="group flex flex-col cursor-pointer border-border bg-card shadow-sm transition-all hover:shadow-md hover:border-primary/30"
      onClick={() => onOpen(article)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary transition-colors">
          {article.title}
        </CardTitle>
        {article.category && (
          <p className="text-xs font-medium text-muted-foreground">{article.category}</p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3">
        {preview && (
          <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed">
            {preview}…
          </p>
        )}

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                <Tag className="mr-1 h-2.5 w-2.5" />
                {tag}
              </Badge>
            ))}
            {article.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0">
                +{article.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          {article.publishedAt && (
            <span className="text-xs text-muted-foreground/70">
              {t('kb.published')}: {formatDate(article.publishedAt)}
            </span>
          )}
          <span className="ml-auto text-xs font-medium text-primary group-hover:underline">
            {t('kb.read_more')} →
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Article reader dialog
// ---------------------------------------------------------------------------

interface ArticleDialogProps {
  article: PortalKbArticle | null;
  onClose: () => void;
}

function ArticleDialog({ article, onClose }: ArticleDialogProps) {
  const { t } = useTranslation('portal');

  return (
    <Dialog open={!!article} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold leading-snug pr-8">
            {article?.title}
          </DialogTitle>
          {article?.category && (
            <p className="text-sm text-muted-foreground">{article.category}</p>
          )}
        </DialogHeader>

        {article?.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-b border-border pb-4">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{article?.content ?? ''}</ReactMarkdown>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            {t('kb.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function PortalKbPage() {
  const { t } = useTranslation('portal');
  const [articles, setArticles] = useState<PortalKbArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<PortalKbArticle | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadArticles = useCallback(async (q?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await portalApi.listKb(q || undefined);
      setArticles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kb.error_load'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadArticles(debouncedSearch);
  }, [debouncedSearch, loadArticles]);

  const isEmpty = !isLoading && !error && articles.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('kb.title')}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('kb.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('kb.search_placeholder')}
          className="pl-9"
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch('')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="flex-1 text-sm font-medium text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadArticles(debouncedSearch)}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <KbSkeleton />
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-base font-semibold">{t('kb.empty_title')}</h3>
          <p className="text-sm text-muted-foreground">
            {debouncedSearch ? t('kb.empty_search') : t('kb.empty_text')}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {articles.length} {articles.length === 1 ? 'Artikel' : 'Artikel'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onOpen={setSelectedArticle}
              />
            ))}
          </div>
        </>
      )}

      {/* Article reader */}
      <ArticleDialog
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
}
