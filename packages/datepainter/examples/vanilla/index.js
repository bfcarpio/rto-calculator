import "../../dist/styles/base.css";
import "../../dist/styles/vanilla.css";
import { CalendarManager } from "datepainter";

const selectedDatesElement = document.getElementById("selected-dates");

// Create calendar manager with correct API
const calendarManager = new CalendarManager("#calendar-container", {
	dateRange: {
		start: new Date("2026-01-01"),
		end: new Date("2026-12-31"),
	},
	states: {
		oof: {
			label: "Out of Office",
			color: "#f5222d",
			bgColor: "#fee2e2",
			icon: "❌",
		},
		holiday: {
			label: "Holiday",
			color: "#faad14",
			bgColor: "#fef3c7",
			icon: "☀️",
		},
		sick: {
			label: "Sick Day",
			color: "#1890ff",
			bgColor: "#e6f7ff",
			icon: "💊",
		},
	},
	painting: {
		enabled: true,
		defaultState: "oof",
	},
	styling: {
		showWeekdays: true,
		showWeekNumbers: true,
		firstDayOfWeek: 0, // Sunday
	},
});

// Initialize the calendar to render it
calendarManager.init();

// Palette functionality
const legend = document.getElementById("status-legend");

function setActiveMode(mode) {
	// Update calendar manager's default state
	calendarManager.config.painting.defaultState = mode;

	// Update UI to show active button
	legend.querySelectorAll(".legend-item").forEach((item) => {
		if (item.getAttribute("data-mode") === mode) {
			item.classList.add("is-active");
		} else {
			item.classList.remove("is-active");
		}
	});
}

// Handle click events on palette buttons
legend.querySelectorAll(".legend-item").forEach((item) => {
	item.addEventListener("click", () => {
		const mode = item.getAttribute("data-mode");
		if (mode) {
			setActiveMode(mode);
		}
	});
});

// Handle keyboard shortcuts (1, 2, 3)
document.addEventListener("keydown", (e) => {
	if (e.key === "1") setActiveMode("oof");
	if (e.key === "2") setActiveMode("holiday");
	if (e.key === "3") setActiveMode("sick");
});

// Register state change callback to update UI
calendarManager.registerStateChange((date, state) => {
	console.log("Selection changed:", date, state);
	updateSelectedDatesDisplay();
});

// Register validation change callback
calendarManager.registerValidationChange((valid, errors) => {
	console.log("Validation changed:", valid, errors);
});

// Function to update the selected dates display
function updateSelectedDatesDisplay() {
	const dates = calendarManager.getAllDates();

	if (dates.size === 0) {
		selectedDatesElement.innerHTML = "No dates selected";
		return;
	}

	const chips = [];
	for (const [dateStr, state] of dates) {
		const stateConfig = calendarManager.config.states[state];
		const color = stateConfig?.color || "#666";

		chips.push(
			`<span class="date-chip" style="background: ${color}20; border: 1px solid ${color}">${dateStr}: ${state}</span>`,
		);
	}

	selectedDatesElement.innerHTML = chips.join("");
}

// Make calendarManager available for debugging
window.calendarManager = calendarManager;
