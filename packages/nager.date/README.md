# nager.date

This is a vendored Nager.Date API wrapper for the RTO Calculator project.

## What is this?

This package contains a TypeScript client for the Nager.Date Public Holiday API. The API client was generated from the official OpenAPI specification.

## Why is it vendored?

- **Type Safety**: Full TypeScript types for all API responses
- **Offline Access**: The API client code is included directly in the project
- **Version Control**: Fixed API schema version for stability

## Original Source

This is based on [Nager.Date](https://github.com/nager/Nager.Date) - a free, open-source public holiday API.

## API Documentation

See the official [Nager.Date API documentation](https://date.nager.at/Api) for full API details.

## Build

```bash
npm run build
```

This compiles the TypeScript source to the `dist/` directory.

## Usage

```typescript
import { PublicHolidaysApi } from 'nager_date_api_reference';

const api = new PublicHolidaysApi();
const holidays = await api.publicHolidaysV3(2026, 'US');
```
