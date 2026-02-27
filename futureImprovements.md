# Future Improvements

## Extract Shared CSS to Global Stylesheet

**Priority**: Medium

Add `.setting-value` class to `src/styles/global.css` to centralize styling:

```css
.setting-value {
  text-decoration: underline dotted;
  text-underline-offset: 2px;
  cursor: help;
}
```

This would remove duplicate inline styles from WindowExplorer.astro.

---

## Refactor String Concatenation

**Priority**: Medium

Replace `html +=` with `Array.join()` for better performance in WindowExplorer.astro:

**Before** (inefficient):

```javascript
for (const item of items) {
  html += `<div>${item}</div>`;
}
```

**After** (efficient):

```javascript
html = items.map((item) => `<div>${item}</div>`).join("");
```

---

## Extract Legend to Separate Component

**Priority**: Low

Extract WindowExplorer legend into a separate Astro component:

- `src/components/WindowExplorerLegend.astro`

Benefits:

- Better maintainability
- Easier to test
- Cleaner separation of concerns

---

## Add Real-Time Update to WindowExplorer

**Priority**: Medium

WindowExplorer values are dynamic but don't update in real-time when settings change. Add event listener for `rto:config-changed` to re-render when settings update.

---

## Create Client-Side Helper for JS Templates

**Priority**: Medium

Create a utility function for use in client-side JavaScript:

```typescript
// src/utils/settingIndicator.ts
export function createSettingIndicator(key: string, value: unknown): string {
  return `<span class="setting-value" 
    data-setting-key="${key}"
    title="Setting: ${key} = ${value}">${value}</span>`;
}
```

This would work in both Astro templates and client-side JS template literals.
