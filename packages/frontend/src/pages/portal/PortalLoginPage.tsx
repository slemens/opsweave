import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
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
              Kundenportal
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Anmelden</CardTitle>
            <CardDescription>
              Melden Sie sich mit Ihren Zugangsdaten an, um Ihre Tickets einzusehen.
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
                <Label htmlFor="tenantSlug">Organisations-ID</Label>
                <Input
                  id="tenantSlug"
                  type="text"
                  placeholder="z. B. acme-corp"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  required
                  autoComplete="organization"
                  autoFocus
                  disabled={isLoading}
                  data-testid="input-portal-tenant"
                />
                <p className="text-xs text-muted-foreground">
                  Die Organisations-ID wurde Ihnen von Ihrem IT-Dienstleister mitgeteilt.
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
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
                <Label htmlFor="password">Passwort</Label>
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
                    Anmelden…
                  </>
                ) : (
                  'Anmelden'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Bei Problemen wenden Sie sich bitte an Ihren IT-Dienstleister.
        </p>
      </div>
    </div>
  );
}
