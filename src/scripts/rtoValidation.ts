/**
 * Clean up RTO validation resources
 */
export function cleanupRTOValidation(): void {
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }

  if (CONFIG.DEBUG) {
    console.log("[RTO Validation] Cleaned up");
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRTOValidation);
} else {
  initRTOValidation();
}

// Export functions globally under RTOValidation namespace
declare global {
  interface Window {
    RTOValidation: {
      runValidation: typeof runValidation;
      runValidationWithHighlights: typeof runValidationWithHighlights;
      clearAllValidationHighlights: typeof clearAllValidationHighlights;
    };
  }
}

// Make functions available globally
if (typeof window !== "undefined") {
  window.RTOValidation = {
    runValidation,
    runValidationWithHighlights,
    clearAllValidationHighlights,
  };
}
