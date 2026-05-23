# Baby Diary Secondary Pages UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor all secondary pages so they inherit the same branded visual system as the refreshed primary pages.

**Architecture:** Normalize the secondary-page shell first in shared layout/header/styles, then refactor pages in two grouped batches: form-flow pages and data-detail pages. Finish with a consistency and verification pass so navigation between primary and secondary pages feels continuous.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, existing local components in `frontend/src/components`

---

## File Map

### Shared files

- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/index.css`

### Form-flow pages

- Modify: `frontend/src/pages/AddRecordPage.tsx`
- Modify: `frontend/src/pages/EditRecordPage.tsx`
- Modify: `frontend/src/pages/AddExpensePage.tsx`
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/pages/JoinFamilyPage.tsx`
- Modify: `frontend/src/pages/AddMemberPage.tsx`

### Data-detail pages

- Modify: `frontend/src/pages/GrowthPage.tsx`
- Modify: `frontend/src/pages/VaccinePage.tsx`
- Modify: `frontend/src/pages/FamilyPage.tsx`

### Verification

- Re-run: `pnpm --filter frontend build`

---

### Task 1: Normalize Secondary Page Shell

**Files:**
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add shared secondary-page utility classes and tokens**

Update `frontend/src/index.css` with reusable secondary-page surface utilities so pages stop inventing one-off card and section treatments.

```css
.secondary-page {
  background:
    radial-gradient(circle at 16% 0%, rgba(255, 244, 223, 0.9) 0, transparent 34%),
    radial-gradient(circle at 88% 14%, rgba(220, 245, 234, 0.95) 0, transparent 30%),
    var(--page-bg);
}

.panel-card {
  border: 1px solid rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 34px rgba(57, 87, 70, 0.08), 0 2px 10px rgba(57, 87, 70, 0.04);
  backdrop-filter: blur(14px);
}

.panel-title {
  color: #1f2937;
  font-size: 16px;
  font-weight: 700;
}

.panel-note {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.45;
}
```

- [ ] **Step 2: Extend `Header` so secondary pages can reuse the branded top treatment**

Update `frontend/src/components/Header.tsx` to support a single branded secondary-page mode instead of old `light/dark/transparent` only.

```tsx
interface HeaderProps {
  title: string;
  subtitle?: string;
  variant?: "light" | "dark" | "transparent" | "hero";
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}
```

Use the existing `--header-grad`, `header-title`, and `header-subtitle` classes for `variant="hero"`, with a readable back button and optional right-side action.

- [ ] **Step 3: Add a small shared wrapper for secondary content sections**

Update `frontend/src/components/Layout.tsx` with a reusable content shell for secondary pages.

```tsx
interface SectionCardProps {
  children: ReactNode;
  className?: string;
}

export function SectionCard({ children, className = "" }: SectionCardProps) {
  return <section className={`panel-card rounded-[24px] p-4 ${className}`}>{children}</section>;
}
```

- [ ] **Step 4: Run build after shared shell changes**

Run: `pnpm --filter frontend build`

Expected: build succeeds and only emits the existing chunk-size warning.

- [ ] **Step 5: Commit shared-shell setup**

```bash
git add frontend/src/components/Layout.tsx frontend/src/components/Header.tsx frontend/src/index.css
git commit -m "refactor: add secondary page ui shell"
```

---

### Task 2: Refactor Record and Expense Form Pages

**Files:**
- Modify: `frontend/src/pages/AddRecordPage.tsx`
- Modify: `frontend/src/pages/EditRecordPage.tsx`
- Modify: `frontend/src/pages/AddExpensePage.tsx`

- [ ] **Step 1: Replace legacy page wrappers with the shared secondary-page shell**

Wrap each page in the same structure:

```tsx
<Layout className="secondary-page">
  <Header title="新增记录" subtitle="补充今天的照护细节" variant="hero" back />
  <ScrollArea className="px-4 pb-28 pt-3">
    <div className="space-y-4">
      <SectionCard>{/* form block */}</SectionCard>
    </div>
  </ScrollArea>
  <div className="border-t border-white/70 bg-white/78 px-4 pb-6 pt-3 backdrop-blur-xl">
    <button className="h-12 w-full rounded-[18px] bg-[#2D9B6A] text-sm font-bold text-white shadow-[0_10px_24px_rgba(45,155,106,.24)]">
      保存
    </button>
  </div>
</Layout>
```

- [ ] **Step 2: Refactor record-type and category selectors into card-based chips**

For `AddRecordPage`, `EditRecordPage`, and `AddExpensePage`, replace raw icon/text options with a unified card selector treatment.

```tsx
className={selected
  ? "rounded-[20px] border border-[#7DD9B8] bg-[#ECFDF5] text-[#1A5C3A]"
  : "rounded-[20px] border border-white bg-white/88 text-gray-700"}
```

Use icon containers like:

```tsx
<div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: surface, color: tone }}>
  <span className="text-xl">{icon}</span>
</div>
```

- [ ] **Step 3: Prioritize the amount or value input visually**

In `AddExpensePage`, make the amount input the visual focal point:

```tsx
<SectionCard className="p-5">
  <div className="panel-note">本次支出</div>
  <div className="mt-3 flex items-end gap-1">
    <span className="text-[22px] font-bold text-[#1A5C3A]">¥</span>
    <div className="font-tabular text-[34px] font-black leading-none text-[#1A5C3A]">{amount || "0"}</div>
  </div>
</SectionCard>
```

- [ ] **Step 4: Group time/detail inputs into consistent white cards**

Use repeated `SectionCard` blocks for time, quantity, notes, presets, and pickers so `AddRecordPage` and `EditRecordPage` stop looking like older utility forms.

- [ ] **Step 5: Run build after form-flow batch**

Run: `pnpm --filter frontend build`

Expected: build succeeds.

- [ ] **Step 6: Commit form-flow batch**

```bash
git add frontend/src/pages/AddRecordPage.tsx frontend/src/pages/EditRecordPage.tsx frontend/src/pages/AddExpensePage.tsx
git commit -m "refactor: refresh record and expense secondary forms"
```

---

### Task 3: Refactor Family and Profile Flows

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/pages/JoinFamilyPage.tsx`
- Modify: `frontend/src/pages/AddMemberPage.tsx`

- [ ] **Step 1: Move all three pages onto the same hero-header plus card-stack structure**

Use short, calm titles:

```tsx
<Header title="我的资料" subtitle="更新你的家庭身份信息" variant="hero" back />
<Header title="加入家庭" subtitle="输入邀请码并选择关系" variant="hero" back />
<Header title="添加成员" subtitle="邀请更多家人一起记录成长" variant="hero" back />
```

- [ ] **Step 2: Unify relation selectors**

Replace legacy relation grids with the same card chip pattern used in Task 2.

```tsx
<button className="flex items-center gap-3 rounded-[20px] border border-white bg-white/88 p-3 text-left shadow-soft">
  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FEF3C7] text-xl">👨</div>
  <div className="flex-1">
    <div className="text-sm font-bold text-gray-900">{label}</div>
  </div>
</button>
```

- [ ] **Step 3: Highlight invite state inside dedicated emphasis cards**

In `JoinFamilyPage` and `AddMemberPage`, render invite code, generated status, or copy feedback inside a dedicated highlight card rather than inline text.

```tsx
<SectionCard className="border border-[#D7F1E5] bg-[#F4FBF7]">
  <div className="panel-note">邀请码</div>
  <div className="mt-2 font-tabular text-xl font-black text-[#1A5C3A]">{inviteCode}</div>
</SectionCard>
```

- [ ] **Step 4: Quiet down `ProfilePage`**

Use one simple form card, one subtle status area, and one strong green submit button. Remove any leftover legacy dark or gray-heavy styling.

- [ ] **Step 5: Run build after family/profile batch**

Run: `pnpm --filter frontend build`

Expected: build succeeds.

- [ ] **Step 6: Commit family/profile batch**

```bash
git add frontend/src/pages/ProfilePage.tsx frontend/src/pages/JoinFamilyPage.tsx frontend/src/pages/AddMemberPage.tsx
git commit -m "refactor: unify family and profile secondary flows"
```

---

### Task 4: Refactor Growth, Vaccine, and Family Detail Pages

**Files:**
- Modify: `frontend/src/pages/GrowthPage.tsx`
- Modify: `frontend/src/pages/VaccinePage.tsx`
- Modify: `frontend/src/pages/FamilyPage.tsx`

- [ ] **Step 1: Move pages to branded hero headers with a consistent first fold**

Each page should open with:

```tsx
<Layout className="secondary-page">
  <Hero>
    <Header title="成长曲线" variant="transparent" back />
    {/* compact stats or filter row */}
  </Hero>
</Layout>
```

Use this same pattern for `VaccinePage` and `FamilyPage`.

- [ ] **Step 2: Normalize tabs, filters, and status chips**

Apply one shared active/inactive style for tabs and status filters:

```tsx
className={active
  ? "rounded-full bg-white text-[#1A5C3A] shadow-[0_8px_20px_rgba(26,92,58,.12)]"
  : "rounded-full bg-white/18 text-white/84"}
```

- [ ] **Step 3: Reframe charts and lists inside `SectionCard` panels**

For `GrowthPage`, place chart and history in separate `SectionCard`s.  
For `VaccinePage`, render planned/completed lists as clean rows with framed icons and readable metadata.  
For `FamilyPage`, convert member items into profile-like cards with clear hierarchy and subdued destructive actions.

- [ ] **Step 4: Re-check floating actions**

Keep the green FAB only where a page still needs a truly local add action. If a local action is retained, it must use the shared `Fab` from `Layout.tsx` with no custom color overrides.

- [ ] **Step 5: Run build after data-detail batch**

Run: `pnpm --filter frontend build`

Expected: build succeeds.

- [ ] **Step 6: Commit data-detail batch**

```bash
git add frontend/src/pages/GrowthPage.tsx frontend/src/pages/VaccinePage.tsx frontend/src/pages/FamilyPage.tsx
git commit -m "refactor: refresh secondary detail pages"
```

---

### Task 5: Consistency Pass and Final Verification

**Files:**
- Modify as needed:
  - `frontend/src/pages/AddRecordPage.tsx`
  - `frontend/src/pages/EditRecordPage.tsx`
  - `frontend/src/pages/AddExpensePage.tsx`
  - `frontend/src/pages/ProfilePage.tsx`
  - `frontend/src/pages/JoinFamilyPage.tsx`
  - `frontend/src/pages/AddMemberPage.tsx`
  - `frontend/src/pages/GrowthPage.tsx`
  - `frontend/src/pages/VaccinePage.tsx`
  - `frontend/src/pages/FamilyPage.tsx`
  - `frontend/src/components/Header.tsx`
  - `frontend/src/components/Layout.tsx`
  - `frontend/src/index.css`

- [ ] **Step 1: Remove duplicated actions and legacy accent colors**

Check every refactored page for:

- duplicate add actions next to bottom-nav global actions
- indigo-only button systems
- low-contrast gray-on-mint text
- inconsistent radius or shadow treatments

- [ ] **Step 2: Normalize empty states and helper text**

Use one content style for empty states:

```tsx
<SectionCard className="px-6 py-8 text-center">
  <div className="text-base font-black text-gray-700">还没有内容</div>
  <div className="mt-2 text-xs leading-relaxed text-gray-400">从一个小动作开始，页面会慢慢变得完整。</div>
</SectionCard>
```

- [ ] **Step 3: Run final build**

Run: `pnpm --filter frontend build`

Expected: build succeeds and only shows the existing chunk-size warning.

- [ ] **Step 4: Manual spot-check**

Verify these transitions visually:

- `HomePage -> AddRecordPage`
- `ExpensePage -> AddExpensePage`
- `MyPage -> ProfilePage`
- `MyPage -> FamilyPage -> AddMemberPage`
- `RecordPage -> GrowthPage`
- `RecordPage -> VaccinePage`

- [ ] **Step 5: Commit final polish**

```bash
git add frontend/src/components/Header.tsx frontend/src/components/Layout.tsx frontend/src/index.css frontend/src/pages
git commit -m "refactor: complete secondary page ui system"
```
