import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Building2,
  Mail,
  Search,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCustomers, useCreateCustomer } from '@/api/customers';
import type { CustomerSummary } from '@/api/customers';

export function CustomersPage() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const { data, isLoading } = useCustomers();
  const createMutation = useCreateCustomer();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formIndustry, setFormIndustry] = useState('');

  const customers = data?.data ?? [];
  const filtered = search.trim()
    ? customers.filter((c: CustomerSummary) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.contact_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.industry ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  function resetForm() {
    setFormName('');
    setFormEmail('');
    setFormIndustry('');
  }

  function handleCreate() {
    if (!formName.trim()) return;
    createMutation.mutate(
      {
        name: formName.trim(),
        contact_email: formEmail.trim() || null,
        industry: formIndustry.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(t('common:customers.create_success'));
          setCreateOpen(false);
          resetForm();
        },
      },
    );
  }

  return (
    <div className="space-y-5" data-testid="page-customers">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('common:nav.customers')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} {t('common:nav.customers')}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" data-testid="btn-create-customer">
          <Plus className="mr-2 h-4 w-4" />
          {t('common:customers.create')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('common:search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-customers"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {/* Customer Cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((customer: CustomerSummary) => (
            <Card
              key={customer.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              onClick={() => navigate(`/customers/${customer.id}`)}
              data-testid={`card-customer-${customer.id}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold truncate">{customer.name}</span>
                    </div>
                    {customer.industry && (
                      <p className="text-xs text-muted-foreground ml-6">{customer.industry}</p>
                    )}
                    {customer.contact_email && (
                      <div className="flex items-center gap-1.5 ml-6">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">{customer.contact_email}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={customer.is_active ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {customer.is_active ? t('common:active') : t('common:inactive')}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3" data-testid="empty-customers">
          <Building2 className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('common:no_results')}</p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent data-testid="modal-create-customer">
          <DialogHeader>
            <DialogTitle>{t('common:customers.create_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="customer-name">{t('common:customers.name')} *</Label>
              <Input
                id="customer-name"
                placeholder={t('common:customers.name_placeholder')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">{t('common:customers.email')}</Label>
              <Input
                id="customer-email"
                type="email"
                placeholder={t('common:customers.email_placeholder')}
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-industry">{t('common:customers.industry')}</Label>
              <Input
                id="customer-industry"
                placeholder={t('common:customers.industry_placeholder')}
                value={formIndustry}
                onChange={(e) => setFormIndustry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!formName.trim() || createMutation.isPending}>
              {t('common:actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
