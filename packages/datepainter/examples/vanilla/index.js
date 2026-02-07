import { CalendarRenderer } from '../../dist/index.js';
import '../../dist/styles/vanilla.css';
import { setDateState, clearDateState, getAllDates } from '../../dist/index.js';
import { formatDate } from '../../dist/index.js';

const config = {
  dateRange: {
    start: new Date('2026-01-01'),
    end: new Date('2026-12-31')
  },
  states: {
    working: {
      label: 'Working',
      color: '#10b981',
      bgColor: '#d1fae5',
      icon: '💼'
    },
    oof: {
      label: 'OOF',
      color: '#ef4444',
      bgColor: '#fee2e2',
      icon: '🏠'
    },
    holiday: {
      label: 'Holiday',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      icon: '🏖️'
    }
  },
  styling: {
    cellSize: 48,
    showWeekdays: true,
    showWeekNumbers: true,
    firstDayOfWeek: 1
  },
  painting: {
    enabled: true,
    paintOnDrag: true,
    defaultState: 'working'
  }
};

const configStates = {
  working: { color: '#10b981', bgColor: '#d1fae5' },
  oof: { color: '#ef4444', bgColor: '#fee2e2' },
  holiday: { color: '#f59e0b', bgColor: '#fef3c7' }
};

const currentPaintState = 'working';
const stateOrder = ['working', 'oof', 'holiday', ''];

function updateSelectedDatesDisplay() {
  const container = document.getElementById('selected-dates');
  if (!container) return;

  const dates = getAllDates();
  const dateArray = Array.from(dates.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  if (dateArray.length === 0) {
    container.textContent = 'No dates selected';
    return;
  }

  container.innerHTML = dateArray.map(([date, state]) => {
    const stateConfig = configStates[state];
    return `
      <span class="date-chip" style="
        background-color: ${stateConfig?.bgColor};
        color: ${stateConfig?.color};
      ">
        ${date} (${state})
      </span>
    `;
  }).join('');
}

function handleDayClick(dayEl) {
  const date = dayEl.dataset.date;
  if (!date) return;

  const currentState = getAllDates().get(date);
  const currentIndex = stateOrder.indexOf(currentState);
  const nextIndex = (currentIndex + 1) % stateOrder.length;
  const newState = stateOrder[nextIndex];

  if (newState) {
    setDateState(date, newState);
    dayEl.classList.add(`rto-calendar-day--${newState}`);
  } else {
    clearDateState(date);
    for (const s of stateOrder.slice(0, -1)) {
      dayEl.classList.remove(`rto-calendar-day--${s}`);
    }
  }

  updateSelectedDatesDisplay();
}

// Create and render calendar
const renderer = new CalendarRenderer('#calendar-container', config);
renderer.render();

// Set up event delegation
const calendar = document.querySelector('.rto-calendar');
if (calendar) {
  calendar.addEventListener('click', (e) => {
    const target = e.target;
    const dayEl = target.closest('.rto-calendar-day');

    if (dayEl && !dayEl.classList.contains('rto-calendar-day--empty')) {
      handleDayClick(dayEl);
    }
  });
}
