# Baby Diary Secondary Pages UI Refactor Design

Date: 2026-05-22

## Goal

Refactor all secondary pages to match the visual language already established on the primary pages:

- `HomePage`
- `RecordPage`
- `ExpensePage`
- `MyPage`

The result should feel like one coherent product system instead of a mixture of old and new page styles.

## Scope

Pages in scope:

- `AddRecordPage`
- `EditRecordPage`
- `AddExpensePage`
- `GrowthPage`
- `VaccinePage`
- `FamilyPage`
- `AddMemberPage`
- `JoinFamilyPage`
- `ProfilePage`

Pages out of scope:

- `HomePage`
- `RecordPage`
- `ExpensePage`
- `MyPage`
- `AuthPage`
- `OnboardingPage`

## Design Direction

The primary pages already define the product direction. Secondary pages should inherit that system directly instead of inventing page-specific styling.

Core traits:

- Mint-to-green branded headers
- Soft layered backgrounds with white content surfaces
- Compact, rounded cards with clear boundaries
- Strong contrast for titles and metrics
- Calm, warm, family-oriented tone
- Dense but readable mobile-first layouts

## Page Groups

### 1. Form Flow Pages

Pages:

- `AddRecordPage`
- `EditRecordPage`
- `AddExpensePage`
- `ProfilePage`
- `JoinFamilyPage`
- `AddMemberPage`

Shared structure:

1. Unified top header with the same branded gradient used across primary pages
2. One short page title plus a low-contrast helper subtitle only when necessary
3. Main content inside stacked white cards on a soft page background
4. Sticky or anchored primary action at the bottom when the page has a submit action

Shared interaction rules:

- Inputs use white or near-white surfaces with visible borders and strong placeholder contrast
- Option chips and segmented controls use the mint system instead of mixed legacy colors
- Numeric entry, pickers, and selection groups use the same radius, spacing, and pressed states
- Error, success, and disabled states follow one visual language across pages

### 2. Data Detail Pages

Pages:

- `GrowthPage`
- `VaccinePage`
- `FamilyPage`

Shared structure:

1. Branded hero header with readable title treatment
2. Secondary stats, filters, or tab controls immediately below the header
3. Main content rendered as clean white panels, lists, or charts with consistent spacing

Shared interaction rules:

- Tabs and filters use one active state system
- Lists use consistent row height, icon treatment, divider logic, and empty states
- Chart wrappers inherit the same card treatment already used on stats surfaces
- Page-level add actions use the unified green FAB only where a floating action is still necessary

## Component System Rules

### Header

- Use the same header gradient token already validated on primary pages
- Preserve readable white title/subtitle treatment
- Keep decorative overlays subtle and consistent
- Avoid custom page-specific header color overrides

### Surfaces

- Primary content cards: white or near-white
- Borders: light but visible, especially over tinted backgrounds
- Shadows: soft and shallow, matching the current home/stat-card treatment
- Radius: align with existing rounded system, avoid introducing sharper or larger radii arbitrarily

### Typography

- Page titles follow the current header title treatment
- Card titles use dark text with clear hierarchy
- Supporting text should not fall below usable contrast
- Avoid gray-on-green or gray-on-white combinations that hurt readability

### Actions

- Primary actions use the green brand system
- Secondary actions prefer text links or subtle bordered buttons
- Avoid heavy indigo or unrelated accent systems on secondary pages
- Where bottom navigation already exposes a global add entry, do not duplicate that action unless the page truly needs a local contextual add affordance

### Icons and Color Semantics

- Functional icons should sit in soft tinted containers, following the same visual logic used on the primary pages
- Semantic color assignments should be stable across pages
- Avoid multiple near-identical blue/green tints for different meanings on the same screen

## Per-Page Intent

### AddRecordPage / EditRecordPage

- Reframe as focused task pages rather than utility forms
- Record type selection should feel like primary choice cards, not raw toggles
- Time, quantity, and detail sections should be grouped into clear form blocks
- The save action should stand out without relying on older dark or mismatched button styles

### AddExpensePage

- Match the expense system already established on `ExpensePage`
- Category selection should visually relate to the refreshed card/icon language
- Amount input is the key focal point and should be visually prioritized

### GrowthPage

- Keep charts readable and framed inside clean panels
- Tab switching for weight/height/head circumference should use one shared pill or segmented pattern
- Historical entries should feel consistent with the refreshed record list density

### VaccinePage

- Planned vs completed states need strong clarity
- Timeline/list rows should use the same contrast, icon framing, and spacing rhythm as the rest of the product
- Add and schedule interactions should inherit the unified action styling

### FamilyPage

- Member cards should read as profile surfaces, not generic list rows
- Invite/add flows should connect visually to `AddMemberPage` and `JoinFamilyPage`
- Remove actions should remain discoverable without dominating the page

### AddMemberPage / JoinFamilyPage

- These should feel like companion flows in the same family-management subsystem
- Relation selection needs clearer hierarchy and feedback
- Invite code or membership state should be visually highlighted without becoming noisy

### ProfilePage

- Keep it simple and quiet
- Form inputs and confirmation states should align with the same form system as other secondary pages

## Implementation Strategy

Implementation should happen in three passes:

1. Build or normalize reusable secondary-page patterns in shared components and global tokens
2. Refactor form-flow pages as one visual batch
3. Refactor data-detail pages and then do a consistency pass across all secondary pages

This reduces duplication and keeps the second-page rollout anchored to the design system instead of page-by-page improvisation.

## Risks and Controls

### Risk: Mixed old/new styling inside one page

Control:

- Move repeated styling into shared structure or repeated class patterns early

### Risk: Conflicts with existing dirty worktree changes

Control:

- Limit edits to page-specific files and clearly shared layout/style files only when needed

### Risk: Accessibility regressions

Control:

- Keep contrast aligned with the primary-page rules already established
- Preserve obvious tap targets and readable text sizes

### Risk: Action duplication

Control:

- Re-check every page against the bottom navigation and existing add flows before keeping a FAB or top-right action

## Testing

Verification should include:

- `pnpm --filter frontend build`
- Manual check of all refactored secondary pages at mobile width
- Spot-check of navigation flow between primary and secondary pages
- Validation that headers, cards, buttons, and empty states feel visually consistent

## Success Criteria

The refactor is successful when:

- All secondary pages clearly belong to the same design system as the primary pages
- Brand color, spacing, shape, and typography feel consistent
- Readability issues from legacy pages are removed
- Redundant actions and page-specific color systems are eliminated
- The app feels visually continuous when moving from a primary page into any secondary page
