# datepainter

A lightweight, framework-agnostic calendar component for date selection and validation.

## Features

- **Drag Selection** - Select date ranges by clicking and dragging
- **Keyboard Navigation** - Full keyboard support for accessibility
- **Flexible Theming** - Customize colors, spacing, and layout
- **State Management** - Track multiple states per date (working, OOF, holiday)
- **Framework Agnostic** - Works with vanilla JS, Astro, React, Vue, and more
- **TypeScript First** - Full type safety and intellisense support
- **Zero Dependencies** - Light bundle size, only nanostores for state

## Installation

```bash
npm install datepainter
```

## Quick Start

### Astro

```astro
---
import { CalendarManager } from 'datepainter';
import 'datepainter/styles/astro.css';
---

<div id="calendar"></div>

<script>
  const manager = new CalendarManager('#calendar', {
    dateRange: {
      start: new Date(2026, 0, 1),
      end: new Date(2026, 11, 31)
    },
    states: {
      working: { label: 'Working', color: '#10b981', bgColor: '#d1fae5' },
      oof: { label: 'OOF', color: '#ef4444', bgColor: '#fee2e2' },
      holiday: { label: 'Holiday', color: '#f59e0b', bgColor: '#fef3c7' }
    }
  });
  manager.init();
</script>
```

### Vanilla JavaScript

```html
<div id="calendar"></div>

<script type="module">
  import { CalendarRenderer } from 'datepainter';
  import 'datepainter/styles/vanilla.css';

  const config = {
    dateRange: {
      start: new Date('2026-01-01'),
      end: new Date('2026-12-31')
    },
    states: {
      working: { label: 'Working', color: '#4CAF50', bgColor: '#E8F5E9' },
      oof: { label: 'OOF', color: '#FF5722', bgColor: '#FFEBE5' }
    }
  };

  const renderer = new CalendarRenderer('#calendar', config);
  renderer.render();
</script>
```

## API Documentation

See [docs/API.md](./docs/API.md) for complete API reference.

## Configuration

### Calendar Config

```typescript
interface CalendarConfig {
  dateRange: {
    start: Date;
    end: Date;
  };
  states: Record<string, StateConfig>;
  styling?: {
    cellSize?: number;
    showWeekdays?: boolean;
    showWeekNumbers?: boolean;
    firstDayOfWeek?: 0 | 1;
  };
  painting?: {
    enabled?: boolean;
    paintOnDrag?: boolean;
    defaultState?: DateState;
  };
}

interface StateConfig {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
  position?: 'above' | 'below' | 'left' | 'right';
}
```

## Styling

The package provides several CSS bundles:

- `datepainter/styles/base.css` - Core calendar styles
- `datepainter/styles/astro.css` - Astro-specific overrides
- `datepainter/styles/vanilla.css` - Vanilla JS styles
- `datepainter/styles/themes.css` - Theme presets

## Examples

See the [examples](./examples/) directory for complete working examples:
- [Astro Example](./examples/astro/)
- [Vanilla JS Example](./examples/vanilla/)

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Troubleshooting

### Calendar not rendering

Make sure you've imported the CSS:
```javascript
import 'datepainter/styles/vanilla.css'; // or astro.css
```

### TypeScript errors

Ensure you have TypeScript 5.0+ and the package is installed correctly:
```bash
npm install --save-dev typescript
```

### Events not firing

Check that you're calling `init()` after creating the CalendarManager instance:
```javascript
const manager = new CalendarManager('#calendar', config);
manager.init(); // Required!
```

## License

MIT

## Links

- [API Documentation](./docs/API.md)
- [Examples](./examples/)
- [Repository](https://github.com/your-org/rto-calculator)

---

Built with ❤️ for the RTO Calculator project
