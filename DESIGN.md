# Gang of Wine Moms — Design System

The single source of truth for how this app looks and behaves. When adding UI,
check here first: if a pattern exists, reuse it; if you invent a new one, add it
here so the app keeps feeling like one product, not a pile of features.

## Personality

Warm, literary, a little indulgent — a wine night with your smartest friends.
Serif headlines (Playfair Display) for the "book" feeling, clean sans
(Source Sans 3) for everything else, wine-red as the only strong color.
Copy is friendly and direct ("Tap the heart to vote"), never corporate.
Emojis are welcome in UI copy (📚🍷), never in code comments.

## Tokens

All colors come from CSS variables in `styles/globals.css` — never hard-code a
hex/oklch value in a component.

| Token | Role | Feel |
|---|---|---|
| `primary` | Wine red — votes, selection, brand moments | The pour |
| `accent` | Lighter wine — secondary emphasis | The swirl |
| `muted` / `muted-foreground` | Chips, captions, secondary text | Background chatter |
| `card` / `border` | Surfaces and hairlines | The table |
| `destructive` | Delete only — never decoration | Spilled wine |

- Radius: `--radius: 0.75rem` (cards `rounded-xl`-ish, chips/buttons `rounded-full` when pill-shaped)
- Spacing: Tailwind scale; cards pad `p-4`, sections separated by `space-y-4`/`space-y-6`
- Type scale: card titles `font-serif text-lg`–`text-xl font-semibold`; body `text-sm`; captions `text-xs text-muted-foreground`

## Core rules

1. **Mobile-first, always.** Design at 375px (iPhone SE). Tap targets ≥ 44px (`h-11`).
2. **One primary action per view.** The big full-width button ("Suggest a Book") is the hero; everything else is quieter.
3. **Show, don't hide** — but only info. Descriptions, chips, ratings live inline. *Actions* are the exception: rare/destructive actions go in the overflow menu (see Card action bar).
4. **No dead ends.** Every empty state says what to do next. Every card has a clear action.
5. **Destructive actions always confirm** via `AlertDialog`, and always live behind the "…" menu — never a floating X on the card.

## Card anatomy

Cards are the app's core metaphor. Every card follows the same vertical stack:

```
┌──────────────────────────────┐
│ [cover]  Title (serif)       │  ← identity: tappable → BookDetailDialog
│          by Author           │
│          description, chips  │  ← info: inline, never behind a tap
│ ─ or ─   date/time/location  │
│ ──────────────────────────── │
│ interactive zone             │  ← RSVP buttons, date poll, etc.
│ ──────────────────────────── │
│ ♥ 3   📅   ↗            ⋯   │  ← action bar (see below)
│ Voted by Emily, Sarah        │  ← social proof caption
└──────────────────────────────┘
```

**Identity zone** (cover/title/author) opens the detail dialog. **Info zone**
is read-only-ish (meeting chips tap to edit). **Action bar** is always last.

## Card action bar (`components/card-action-bar.tsx`)

Instagram-style strip that keeps actions tidy instead of a wrapping pile of
labeled buttons:

- **Left:** up to 3 icon actions (`ghost`, `rounded-full`, 44px tall). Order =
  importance: engage (♥ vote) → act (📅 schedule) → spread (↗ share).
- **Active state:** filled icon + `text-primary` (like a liked heart). Counts
  sit beside the icon (`♥ 3`).
- **Right:** a `⋯` overflow `DropdownMenu` for rare or destructive actions
  (edit, delete). Delete renders in `destructive` red and still confirms.
- **Caption:** optional social-proof line beneath ("Voted by Emily, Sarah") —
  the IG "liked by" pattern.
- Icon-only on the smallest screens, icon + tiny label from `sm:` up.

Rule of thumb: if a card grows a fourth inline action, one of them moves to
the overflow. Never add a one-off button floating elsewhere on the card.

## Date poll (`components/date-poll.tsx`)

A meeting can start as a poll instead of a fixed date ("Set a date | Poll for
dates" toggle in the schedule form). Poll cards show tappable date rows
(checkbox-style toggle = "works for me"), voter names + counts per row, the
leading row gets a subtle ring, and a "Lock in <date>" button converts the
poll into a normal RSVP meeting (with confirm dialog). Same interaction grammar
as book voting: tap to toggle, leader highlighted, then someone finalizes.

## Interaction grammar

- **Toggle-to-express**: hearts (book votes) and checks (date votes) toggle on/off; state is always visible (filled = you're in).
- **Leader highlight**: whatever is winning gets `ring-2 ring-primary` (book with most votes, leading date option).
- **Chips** (`rounded-full bg-muted`): small metadata; tappable chips (date/time/location) edit what they show.
- **Segmented control** (`bg-muted` track, `bg-card` active pill): choosing between two modes, e.g. "Set a date | Poll for dates".
- **Forms** appear as inline cards (`border-primary/20`), not modals — modals are reserved for confirms and the book detail view.

## Voice & copy

- Address the group as "the gang". Questions over commands: "Which dates work for you?"
- Buttons say what happens: "Lock it in", "Start Date Poll", "Add Suggestion" — never "OK"/"Submit".
- Confirm dialogs state consequences plainly: "This closes the poll and sets the meeting date."

## Inspiration (what we borrow, from whom)

- **Instagram** — the action bar: icon row + counts + "liked by" caption; actions feel effortless, not like a form.
- **Airbnb** — warm serif + photo-forward cards; generous whitespace makes few elements feel premium. Our covers = their listing photos.
- **Apple HIG** — 44px tap targets, one primary action per screen, destructive actions confirmed and never one accidental tap away.
- **Shopify Polaris** — plain-language copy rules ("buttons start with a verb") and empty states that teach the next step.
- **Vercel Geist / shadcn** — restraint: one accent color, hairline borders, `muted` for everything secondary. We already build on shadcn/ui primitives; don't restyle them per-feature.

## Checklist for any new UI

- [ ] Works at 375px; tap targets ≥ 44px
- [ ] Uses tokens (no raw colors), serif only for titles
- [ ] Card follows the anatomy above; actions live in the action bar
- [ ] Destructive path = overflow menu + confirm dialog
- [ ] Empty state exists and points somewhere
- [ ] Copy sounds like a friend, starts buttons with verbs
- [ ] Pattern documented here if it's new
