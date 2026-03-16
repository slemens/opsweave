import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { setPortalAuth } from '@/api/portal';
import type { PortalAuth } from '@/api/portal';

export function PortalLoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('portal');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const resp = await fetch('/api/v1/portal/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, tenantSlug }),
      });

      if (!resp.ok) {
        const err = (await resp.json()) as { error: { message: string } };
        setError(err.error.message);
        return;
      }

      const data = (await resp.json()) as { data: PortalAuth };
      setPortalAuth(data.data);
      navigate('/portal/tickets');
    } catch {
      setError(t('auth.error_generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" data-testid="page-portal-login">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Heading */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <span className="text-lg font-bold tracking-tight">OW</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              OpsWeave
            </h1>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {t('nav.badge')}
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">{t('auth.title')}</CardTitle>
            <CardDescription>
              {t('auth.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-portal-login">
              {/* Error message */}
              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Tenant slug */}
              <div className="space-y-2">
                <Label htmlFor="tenantSlug">{t('auth.org_id')}</Label>
                <Input
                  id="tenantSlug"
                  type="text"
                  placeholder={t('auth.org_id_placeholder')}
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  required
                  autoComplete="organization"
                  autoFocus
                  disabled={isLoading}
                  data-testid="input-portal-tenant"
                />
                <p className="text-xs text-muted-foreground">
                  {t('auth.org_id_hint')}
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="max.mustermann@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  data-testid="input-portal-email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  data-testid="input-portal-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email || !password || !tenantSlug}
                data-testid="btn-portal-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.submitting')}
                  </>
                ) : (
                  t('auth.submit')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          {t('auth.help')}
        </p>
      </div>
    </div>
  );
}
