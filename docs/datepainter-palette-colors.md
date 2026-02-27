# Datepainter Palette Colors - Option C Implementation

## Overview

This document describes how to implement dynamic palette switching based on dark/light mode using the `[data-palette]` attribute. This is **Option C** from the color scheme planning.

## Current State

- ThemeManager adds `body.dark-mode` and `body.datepainter-dark-mode` classes for dark mode
- CSS already has palette definitions with `[data-palette="tol-muted-light"]` and `[data-palette="tol-muted-dark"]`
- ThemeManager sets `data-palette` attribute on body (e.g., "tol-muted")

## Problem

Currently, the palette is static (doesn't change between light/dark mode). The `[data-palette]` attribute is set once based on the palette name but doesn't respond to dark/light theme changes.

## Solution

Update ThemeManager to:

1. **Detect dark/light mode** from the colorScheme (e.g., "tol-muted-light" vs "tol-muted-dark")
2. **Update `data-palette` attribute** when theme changes

### Step 1: Update applyThemeToDocument

In `src/lib/themeManager.ts`, update the `applyThemeToDocument` function to also update the `data-palette` attribute:

```typescript
function applyThemeToDocument(isDark: boolean): void {
  // Get current colorScheme from state
  const colorScheme = this.state.currentColorScheme;

  // Determine palette: tol-muted-light → tol-muted, tol-muted-dark → tol-muted
  const palette = colorScheme.split("-").slice(0, 2).join("-"); // e.g., "tol-muted"

  // Set data-palette attribute (e.g., "tol-muted" becomes "tol-muted-light" or "tol-muted-dark")
  const fullPalette = isDark ? `${palette}-dark` : `${palette}-light`;
  document.body.setAttribute("data-palette", fullPalette);

  // Existing dark mode classes
  if (isDark) {
    document.body.classList.add("dark-mode");
    document.body.classList.add("datepainter-dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
    document.body.classList.remove("datepainter-dark-mode");
  }
}
```

### Step 2: Ensure palette names are consistent

The colorScheme values should follow the pattern:

- `{palette}-{mode}` where:
  - palette: `tol-bright`, `tol-vibrant`, `tol-muted`
  - mode: `light`, `dark`

So valid values are:

- `tol-bright-light`, `tol-bright-dark`
- `tol-vibrant-light`, `tol-vibrant-dark`
- `tol-muted-light`, `tol-muted-dark`

### Step 3: CSS is already ready

The CSS in `packages/datepainter/styles/themes.css` already has the palette definitions:

```css
[data-palette="tol-muted-light"] {
  --datepainter-oof: #44aa99;
  --datepainter-holiday: #ddcc77;
  --datepainter-sick: #332288;
}

[data-palette="tol-muted-dark"] {
  --datepainter-oof: #44aa99;
  --datepainter-holiday: #eeaa55;
  --datepainter-sick: #8877cc;
}
```

When `data-palette` is updated to include the mode suffix, the correct colors will apply automatically.

## Testing

After implementation:

1. Select "Tol Muted (Light)" - calendar should show light palette colors
2. Select "Tol Muted (Dark)" - calendar should show dark palette colors
3. Other palettes (Bright, Vibrant) should also work with both light/dark

## Benefits

- Colors automatically adapt to light/dark mode per palette
- Each palette has optimized colors for each mode
- Future palettes (if added) will automatically work
- No duplicate CSS selectors needed
