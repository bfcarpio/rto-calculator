# Datepainter - Astro Example

This example demonstrates how to use the datepainter package with Astro.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:4321`

## Usage

- Click on a date to cycle through states: Working → OOF → Holiday → Unselected
- Selected dates are displayed below the calendar
- The calendar shows all months from January to December 2026

## Customization

Edit `src/pages/index.astro` to:
- Change the date range
- Add or modify states
- Adjust styling options
- Customize the behavior

## Production Build

```bash
npm run build
npm run preview
```

## Notes

This example imports from the local package source (`../../../src`). In a real project, you would install the package via npm:

```bash
npm install datepainter
```

Then import like this:

```astro
import { CalendarManager } from 'datepainter';
import 'datepainter/styles/astro.css';
```
