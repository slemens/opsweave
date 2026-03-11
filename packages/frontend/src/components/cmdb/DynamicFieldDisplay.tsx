// =============================================================================
// OpsWeave — Dynamic Field Display (Evo-3E)
// Renders attribute values in a read-only grid layout.
// =============================================================================

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AttributeDefinition } from '@opsweave/shared';
import { getLocalizedLabel } from '@/lib/attribute-schema';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DynamicFieldDisplayProps {
  schema: AttributeDefinition[];
  values: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DynamicFieldDisplay({ schema, values }: DynamicFieldDisplayProps) {
  const { i18n, t } = useTranslation('cmdb');
  const locale = i18n.language;

  // Sort by sort_order and group by group, filter out empty values
  const grouped = useMemo(() => {
    const sorted = [...schema].sort((a, b) => a.sort_order - b.sort_order);
    const groups = new Map<string, AttributeDefinition[]>();

    for (const def of sorted) {
      const val = values[def.key];
      // Skip empty/null/undefined values
      if (val === undefined || val === null || val === '') continue;
      if (def.type === 'multiselect' && Array.isArray(val) && val.length === 0) continue;

      const groupKey = def.group ?? '';
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(def);
    }

    return groups;
  }, [schema, values]);

  if (grouped.size === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        {t('dynamic_fields.no_attributes')}
      </p>
    );
  }

  const groupEntries = Array.from(grouped.entries());

  return (
    <div className="space-y-4">
      {groupEntries.map(([groupName, defs], groupIdx) => (
        <div key={groupName || '__default'}>
          {groupName && (
            <>
              {groupIdx > 0 && <Separator className="my-3" />}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {groupName}
              </p>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            {defs.map((def) => (
              <FieldValue
                key={def.key}
                def={def}
                value={values[def.key]}
                locale={locale}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field Value Renderer
// ---------------------------------------------------------------------------

function FieldValue({
  def,
  value,
  locale,
}: {
  def: AttributeDefinition;
  value: unknown;
  locale: string;
}) {
  const { t: tCommon } = useTranslation('common');
  const label = getLocalizedLabel(def.label, locale);

  const renderValue = () => {
    switch (def.type) {
      case 'boolean':
        return (
          <span className="text-sm">
            {value ? tCommon('yes') : tCommon('no')}
          </span>
        );

      case 'date':
        if (typeof value === 'string' && value) {
          try {
            const formatted = new Intl.DateTimeFormat(
              locale.startsWith('en') ? 'en-GB' : 'de-DE',
              { year: 'numeric', month: '2-digit', day: '2-digit' },
            ).format(new Date(value));
            return <span className="text-sm">{formatted}</span>;
          } catch {
            return <span className="text-sm">{String(value)}</span>;
          }
        }
        return <span className="text-sm">{String(value)}</span>;

      case 'select': {
        const opt = def.options?.find((o) => o.value === value);
        return (
          <Badge variant="outline" className="text-xs">
            {opt ? getLocalizedLabel(opt.label, locale) : String(value)}
          </Badge>
        );
      }

      case 'multiselect': {
        const arr = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="flex flex-wrap gap-1">
            {arr.map((v) => {
              const opt = def.options?.find((o) => o.value === v);
              return (
                <Badge key={v} variant="outline" className="text-xs">
                  {opt ? getLocalizedLabel(opt.label, locale) : v}
                </Badge>
              );
            })}
          </div>
        );
      }

      case 'url':
        return (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate block"
          >
            {String(value)}
          </a>
        );

      case 'ip_address':
        return <span className="text-sm font-mono">{String(value)}</span>;

      case 'number':
        return <span className="text-sm">{String(value)}</span>;

      default:
        return <span className="text-sm">{String(value)}</span>;
    }
  };

  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{renderValue()}</div>
    </div>
  );
}
