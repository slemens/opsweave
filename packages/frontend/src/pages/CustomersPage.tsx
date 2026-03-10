import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Mail,
  Search,
  Server,
  Ticket,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { useCustomers } from '@/api/tickets';
import type { CustomerSummary } from '@/api/tickets';

export function CustomersPage() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const { data, isLoading } = useCustomers();
  const [search, setSearch] = useState('');

  const customers = data?.data ?? [];
  const filtered = search.trim()
    ? customers.filter((c: CustomerSummary) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.contact_email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.industry ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : customers;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('common:nav.customers')}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} {t('common:nav.customers')}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('common:search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Building2 className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('common:no_results')}</p>
        </div>
      )}
    </div>
  );
}
