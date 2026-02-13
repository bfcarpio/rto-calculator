# Datepainter - Vanilla JS Example

This example demonstrates how to use the datepainter package with vanilla JavaScript.

## Setup

1. Serve this example using any static file server:

   Using Python 3:
   ```bash
   cd examples/vanilla
   python -m http.server 8000
   ```

   Using Node.js (if you have http-server installed):
   ```bash
   npx http-server -p 8000
   ```

2. Open your browser to `http://localhost:8000`

## Usage

- Click on a date to cycle through states: Working → OOF → Holiday → Unselected
- Selected dates are displayed below the calendar
- The calendar shows all months from January to December 2026

## Customization

Edit `index.html` to:
- Change the date range
- Add or modify states
- Adjust styling options
- Customize the behavior

## Production Usage

In a production project, you would install the package via npm:

```bash
npm install datepainter
```

Then import like this:

```javascript
import { CalendarRenderer } from 'datepainter';
import 'datepainter/styles/vanilla.css';
```

Or use a CDN:

```html
<script type="module">
  import { CalendarRenderer } from 'https://cdn.example.com/datepainter/index.js';
</script>
```

## Notes

This example imports from the local package source (`../src/`). The build process will create the distribution files in the `dist/` directory that can be imported in production.
