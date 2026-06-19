/**
 * Accessibility utilities for screen reader announcements.
 *
 * Provides a shared function for making screen reader announcements
 * via ARIA live regions, used by both CalendarEventManager and
 * SettingsModal.
 *
 * @module accessibility
 */

/**
 * Announce a message to screen readers.
 *
 * Creates a temporary DOM element with ARIA live attributes, appends it
 * to the document body, and removes it after the announcement is read.
 * This is the standard pattern for making dynamic content changes
 * accessible to assistive technology.
 *
 * @param message - The message to announce
 */
export function announceToScreenReader(message: string): void {
	const announcement = document.createElement("div");
	announcement.setAttribute("role", "status");
	announcement.setAttribute("aria-live", "polite");
	announcement.setAttribute("aria-atomic", "true");
	announcement.className = "sr-only calendar-announcement";
	announcement.textContent = message;

	document.body.appendChild(announcement);

	setTimeout(() => {
		if (document.body.contains(announcement)) {
			document.body.removeChild(announcement);
		}
	}, 1000);
}
