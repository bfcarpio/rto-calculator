# RTO Calculator

A modern web-based Return-to-Office (RTO) compliance calculator that helps teams track and validate office attendance requirements. Built with Astro, this application provides an intuitive interface for managing and visualizing office day selections against configurable RTO policies.

## Features

### Core Functionality
- **Interactive Calendar Interface**: Select office days across 12 months with an intuitive day-by-day selection system
- **Real-time Validation**: Instant feedback on whether your office day selections meet RTO policy requirements
- **Sliding Window Analysis**: Advanced algorithm that evaluates compliance over rolling 12-week periods
- **Visual Status Indicators**: Clear color-coded feedback showing compliance status at a glance

### Configuration & Customization
- **Customizable Parameters**: Adjust rolling period weeks, evaluation weeks, minimum office days per week, and threshold percentages
- **Settings Modal**: Easy-to-use interface for modifying validation rules and office day patterns
- **Pattern Selector**: Set default work patterns for weekdays
- **Debug Mode**: Optional debug logging for development and troubleshooting

## Algorithm Implementation

### Sliding Window Validation

The RTO Calculator uses a sliding window algorithm to evaluate compliance across time periods. The implementation follows a Strategy Pattern architecture for extensibility.

#### Core Validation Logic

1. **Data Collection**: The system aggregates selected office days into weekly units
2. **Window Processing**: A configurable sliding window (default: 12 weeks) moves across the time period
3. **Compliance Calculation**: Each window is evaluated against the configured RTO policy:
   - Calculates actual office days within the window
   - Compares against minimum required days per week
   - Evaluates percentage compliance against threshold
4. **Result Aggregation**: All windows must pass validation for overall compliance

#### Key Components

- **ValidationManager**: Orchestrates the validation process and manages validation strategies
- **RollingPeriodValidation**: Implements the sliding window algorithm with configurable parameters
- **WeekInfo Interface**: Structures week data including start date, end date, and office day counts
- **SlidingWindowResult Interface**: Captures validation results for each window period

#### Validation Parameters

```javascript
{
  minOfficeDaysPerWeek: 3,      // Required office days per week
  totalWeekdaysPerWeek: 5,     // Number of weekdays in a week
  rollingPeriodWeeks: 12,      // Size of the sliding window
  thresholdPercentage: 0.6,    // Minimum compliance percentage (3/5 = 60%)
  debug: false                 // Enable debug logging
}
```

The algorithm filters out partial weeks and only considers complete weeks within the evaluation period to ensure accurate compliance calculations.

## Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:4321`

3. **Build for Production**:
   ```bash
   npm run build
   ```
   The optimized build will be output to the `./dist/` directory

4. **Preview Production Build**:
   ```bash
   npm run preview
   ```

## Testing

The project includes test coverage using Vitest:
- Unit tests for validation logic
- Component tests for UI elements

Run tests with:
```bash
npm test
```
