import '../../dist/styles/base.css';
import '../../dist/styles/vanilla.css';
import { CalendarManager } from 'datepainter';

const selectedDatesElement = document.getElementById('selected-dates');

// Create calendar manager with correct API
const calendarManager = new CalendarManager(
  '#calendar-container',
  {
    dateRange: {
      start: new Date('2026-01-01'),
      end: new Date('2026-12-31')
    },
    states: {
      working: {
        label: 'Working',
        color: '#4CAF50',
        bgColor: '#e8f5e9',
        icon: '💼'
      },
      oof: {
        label: 'Out of Office',
        color: '#FF5722',
        bgColor: '#ffebee',
        icon: '🏠'
      },
      holiday: {
        label: 'Holiday',
        color: '#2196F3',
        bgColor: '#e3f2fd',
        icon: '🏖️'
      }
    },
    painting: {
      enabled: true,
      defaultState: 'working'
    },
    styling: {
      showWeekdays: true,
      showWeekNumbers: true,
      firstDayOfWeek: 0 // Sunday
    }
  }
);

// Initialize the calendar to render it
calendarManager.init();

// Register state change callback to update UI
calendarManager.registerStateChange((date, state) => {
  console.log('Selection changed:', date, state);
  updateSelectedDatesDisplay();
});

// Register validation change callback
calendarManager.registerValidationChange((valid, errors) => {
  console.log('Validation changed:', valid, errors);
});

// Function to update the selected dates display
function updateSelectedDatesDisplay() {
  const dates = calendarManager.getAllDates();
  
  if (dates.size === 0) {
    selectedDatesElement.innerHTML = 'No dates selected';
    return;
  }
  
  const chips = [];
  for (const [dateStr, state] of dates) {
    const stateConfig = calendarManager.config.states[state];
    const color = stateConfig?.color || '#666';
    
    chips.push(`<span class="date-chip" style="background: ${color}20; border: 1px solid ${color}">${dateStr}: ${state}</span>`);
  }
  
  selectedDatesElement.innerHTML = chips.join('');
}

// Make calendarManager available for debugging
window.calendarManager = calendarManager;
