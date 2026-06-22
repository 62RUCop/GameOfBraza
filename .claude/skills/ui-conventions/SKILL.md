---
name: ui-conventions
description: >
  UI patterns for GameOfBraza: the editable-field + gray-hint + neutral-highlight
  triad, shadcn/ui component usage, accessibility rules, i18n, and the
  manual_override "pinned" indicator. Use this skill whenever building or
  reviewing any UI component in apps/web — especially character sheet fields,
  stat displays, equipment slots, or any input that shows a computed suggestion
  alongside a user-editable value.
---

# GameOfBraza — UI Conventions

## Core philosophy

The UI is a **storage and display tool**, not a game enforcer.
- Computed values are shown as *suggestions*, not constraints.
- Out-of-range values get a neutral hint, never a blocking error.
- Players can always save whatever they type. No hard validation that prevents submission.

---

## The three-layer field pattern

Every stat/derived field that has a computed suggestion follows this pattern:

```
┌────────────────────────────────┐
│ [editable input: value]        │  ← stores character.value
│ Suggested: 42                  │  ← gray, small, below — suggestedValue
│ ⚠ Outside calculated range     │  ← neutral highlight if value ≠ suggestedValue significantly
└────────────────────────────────┘
```

### Implementation

```tsx
// Reusable component: packages/ui/src/StatField.tsx
interface StatFieldProps {
  label: string
  value: number
  suggestedValue?: number
  manualOverride?: boolean
  onChange: (v: number) => void
  onResetOverride?: () => void
}

export function StatField({ label, value, suggestedValue, manualOverride, onChange, onResetOverride }: StatFieldProps) {
  const isOutOfRange = suggestedValue !== undefined && Math.abs(value - suggestedValue) > THRESHOLD
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={cn(isOutOfRange && 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-900/10')}
        />
        {manualOverride && (
          <button
            onClick={onResetOverride}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            title={t('field.reset_to_auto')}
          >
            <PinIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {suggestedValue !== undefined && (
        <span className="text-xs text-muted-foreground">
          {t('field.suggested', { value: suggestedValue })}
        </span>
      )}
      {isOutOfRange && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          {t('field.unusual_value')}
        </span>
      )}
    </div>
  )
}
```

**Neutral highlight** = `border-amber-400/60` + subtle background tint.
Never use `border-red-*` or `text-red-*` for out-of-range values — red implies error, which this is not.

---

## manual_override "pinned" indicator

Any field where `manual_override = true` shows:
- A pin icon (e.g. `PinIcon` from lucide-react) inside or adjacent to the input
- Tooltip: `t('field.pinned_by_gm')` or `t('field.pinned_manually')`
- A clickable "Reset to auto" action (calls `PATCH /characters/{id}/stats/{key}/override` with a reset payload)

Use `ManualBadge` component (from `packages/ui`) wherever a pinned field appears, including on the GM's overview panel.

---

## shadcn/ui usage

Base components from `packages/ui/src/` (shadcn/ui wrappers):
- `Input`, `Button`, `Badge`, `Card`, `Tabs`, `Dialog`, `Popover`, `Tooltip`
- `Progress` — for HP/mana/AP bars
- `Slider` — for reputation scale (read-only display, not interactive)

**Do not** import from `@radix-ui` directly — use the shadcn wrappers in `packages/ui`.
**Do not** add inline `className` color overrides that duplicate Tailwind theme variables — use semantic class names (`text-foreground`, `bg-muted`, etc.).

Custom tokens defined in `apps/web/tailwind.config.ts`:
- `tier-0` … `tier-4` — color scale for tier badges
- `reputation-neg` / `reputation-pos` — for reputation indicators

---

## Stat bar (Attributes tab — §7.2)

Each stat displays as a **ribbon of 20 cells**:

```tsx
// value <= 20: single row of cells
// value > 20: multiple layers, each layer has distinct opacity/border
function StatRibbon({ value, max = 20 }: { value: number; max?: number }) {
  const layers = Math.ceil(value / max)
  return (
    <div className="flex flex-col gap-0.5" role="meter" aria-valuenow={value}>
      {Array.from({ length: layers }).map((_, layer) => (
        <div key={layer} className={cn('flex gap-px', layer > 0 && 'opacity-70')}>
          {Array.from({ length: max }).map((_, i) => {
            const cellValue = layer * max + i + 1
            return (
              <div
                key={i}
                className={cn(
                  'h-4 w-3 rounded-sm',
                  cellValue <= value ? 'bg-primary' : 'bg-muted'
                )}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

---

## Equipment tier lock indicator (§7.3)

Items above the character's `attribute_power_tier` show a lock badge:

```tsx
{isLocked && (
  <Badge variant="outline" className="border-muted text-muted-foreground gap-1">
    <LockIcon className="h-3 w-3" />
    {t('equipment.needs_stat', { stat: item.required_attribute, needed: item.tier })}
  </Badge>
)}
```

Never disable the card entirely — show it, just prevent the equip action.

---

## i18n

All user-visible strings go through `i18next`. No hardcoded Russian text in components.

```tsx
import { useTranslation } from 'react-i18next'
const { t } = useTranslation()
// Usage: t('character.hp_max'), t('field.suggested', { value: 42 })
```

Key namespace structure:
```
public/locales/ru/
  common.json       — shared UI labels
  character.json    — character sheet strings
  equipment.json    — item/slot strings
  skills.json       — skill-related strings
  gm.json           — GM panel strings
  admin.json        — admin panel strings
```

---

## Accessibility

- Every interactive element has an accessible label (explicit `<label>` or `aria-label`)
- Stat ribbons: `role="meter"` with `aria-valuenow` / `aria-valuemax`
- Modal dialogs: `role="dialog"` + focus trap (handled by Radix Dialog)
- Color is never the sole indicator — pair with icon or text (e.g. tier-lock = icon + text, not just color)
- Touch targets ≥ 44×44 px (mobile-friendly, §8 TZ)

---

## Mobile-first layout

- Base design for narrow viewport (≥ 375px)
- Tabs on the character sheet use horizontal scroll on mobile, not a drawer
- Stat ribbon wraps gracefully on small screens
- Equipment paperdoll: 2-column grid on mobile, visual slots on desktop
- Test at 375px before marking any UI task complete

---

## Form handling

Forms use `react-hook-form` + Zod resolver:

```tsx
const schema = z.object({
  hp_current: z.number().int().min(0),  // type validation only — no game-rule limits
})
const form = useForm({ resolver: zodResolver(schema) })
```

Zod validates **type and format**, NOT game rules. A HP value of 9999 is valid from the form's perspective.
Game-rule suggestions come from the API's `suggestedValue` response field, shown as hints.
