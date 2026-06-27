# Date Control Design QA

- Source visual truth: `/tmp/codex-remote-attachments/019ef32f-9a87-7311-9858-5e12ad42ebcb/9466DC5C-033A-4E27-A822-02E5A685C0C0/1-照片-1.jpg`
- Implementation screenshot: unavailable
- Intended viewport: 430 x 900 mobile
- State: growth-moment editor with a selected date

## Full-view comparison evidence

The source screenshot was opened and inspected. It shows the native date control extending beyond the intended inner content width and using platform-native typography, height, alignment, and corner treatment that differ from the app's card language.

The deployed implementation could not be captured in the same authenticated state. The production route requires a real signed-in account, while the browser security policy blocked the isolated local-file preview. No full-view visual comparison was possible.

## Focused region comparison evidence

The source date-control region was inspected at full resolution. The replacement uses the same explicit width, border, background, radius, spacing, and typography classes in every form location, but it could not be visually captured for a side-by-side comparison.

## Findings

- [P1] Rendered implementation evidence is unavailable.
  - Location: growth-moment editor date card and shared date form controls.
  - Evidence: source image is available; matching implementation screenshot is not.
  - Impact: code and build checks cannot prove final visual alignment on the user's device.
  - Fix: capture the updated `/moments/new` screen at 430 x 900 while signed in, then compare it with the source screenshot.

## Patches made

- Replaced native date inputs with a shared `DateFieldButton`.
- Unified date triggers in moments, growth, onboarding, expenses, and vaccines.
- Kept the shared bottom-sheet picker and background scroll lock.
- Added maximum-date handling for past-only forms while keeping future vaccine planning available.

## Required fidelity surfaces

- Fonts and typography: defined consistently in the shared component; rendered comparison blocked.
- Spacing and layout rhythm: explicit full-width button, 18px radius, 16px horizontal padding, and 56px minimum height; rendered comparison blocked.
- Colors and visual tokens: uses existing ink, mint, border, and form-background tokens; rendered comparison blocked.
- Image quality and asset fidelity: no image asset is part of this control.
- Copy and content: selected date plus a concise `更改` action; source task meaning preserved.

## Final result

final result: blocked
