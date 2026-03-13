import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background" data-testid="page-not-found">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">404</h1>
          <h2 className="text-xl font-semibold">{t('not_found.title')}</h2>
          <p className="text-muted-foreground max-w-md">
            {t('not_found.description')}
          </p>
        </div>
        <Button onClick={() => navigate('/')} data-testid="btn-go-home">
          {t('not_found.go_home')}
        </Button>
      </div>
    </div>
  );
}
