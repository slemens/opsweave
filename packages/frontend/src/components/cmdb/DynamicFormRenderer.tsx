// =============================================================================
// OpsWeave — Dynamic Form Renderer (Evo-3E)
// Renders form fields dynamically based on AttributeDefinition schemas.
// =============================================================================

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AttributeDefinition } from '@opsweave/shared';
import { getLocalizedLabel } from '@/lib/attribute-schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DynamicFormRendererProps {
  schema: AttributeDefinition[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DynamicFormRenderer({
  schema,
  values,
  onChange,
  disabled = false,
}: DynamicFormRendererProps) {
  const { i18n, t } = useTranslation('cmdb');
  const locale = i18n.language;

  // Sort by sort_order and group by group
  const grouped = useMemo(() => {
    const sorted = [...schema].sort((a, b) => a.sort_order - b.sort_order);
    const groups = new Map<string, AttributeDefinition[]>();
    for (const def of sorted) {
      const groupKey = def.group ?? '';
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(def);
    }
    return groups;
  }, [schema]);

  const handleChange = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  if (schema.length === 0) {
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
              <FieldRenderer
                key={def.key}
                def={def}
                value={values[def.key]}
                locale={locale}
                disabled={disabled}
                onChange={(v) => handleChange(def.key, v)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Field Renderer
// ---------------------------------------------------------------------------

function FieldRenderer({
  def,
  value,
  locale,
  disabled,
  onChange,
}: {
  def: AttributeDefinition;
  value: unknown;
  locale: string;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const label = getLocalizedLabel(def.label, locale);

  // Boolean renders as a single row (switch + label side by side)
  if (def.type === 'boolean') {
    return (
      <div className="col-span-2 flex items-center justify-between gap-3 py-1">
        <Label className="text-sm">
          {label}
          {def.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Switch
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
          disabled={disabled}
        />
      </div>
    );
  }

  // Multiselect spans full width
  if (def.type === 'multiselect') {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="col-span-2 grid gap-2">
        <Label className="text-sm">
          {label}
          {def.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <div className="space-y-2 rounded-md border p-3">
          {(def.options ?? []).map((opt) => {
            const optLabel = getLocalizedLabel(opt.label, locale);
            const isChecked = selected.includes(opt.value);
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${def.key}-${opt.value}`}
                  checked={isChecked}
                  disabled={disabled}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selected, opt.value]);
                    } else {
                      onChange(selected.filter((v) => v !== opt.value));
                    }
                  }}
                />
                <Label
                  htmlFor={`${def.key}-${opt.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {optLabel}
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <Label className="text-sm">
        {label}
        {def.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {def.type === 'select' ? (
        <Select
          value={value != null ? String(value) : ''}
          onValueChange={onChange}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder={'\u2014'} />
          </SelectTrigger>
          <SelectContent>
            {!def.required && <SelectItem value="">{'\u2014'}</SelectItem>}
            {(def.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {getLocalizedLabel(opt.label, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : def.type === 'number' ? (
        <Input
          type="number"
          value={value != null && value !== '' ? String(value) : ''}
          min={def.validation?.min}
          max={def.validation?.max}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? null : Number(v));
          }}
        />
      ) : def.type === 'date' ? (
        <Input
          type="date"
          value={value != null ? String(value) : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        // text, url, ip_address
        <Input
          type={def.type === 'url' ? 'url' : 'text'}
          value={value != null ? String(value) : ''}
          disabled={disabled}
          placeholder={def.type === 'ip_address' ? '10.0.0.1' : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
