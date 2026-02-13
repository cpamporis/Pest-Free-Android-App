// utils/timeZoneUtils.js - UPDATE THIS FILE

/**
 * Format time in Greece timezone (Europe/Athens)
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted time in Greece timezone
 */
export const formatTimeInGreece = (dateString) => {
  if (!dateString || dateString === "null" || dateString === "undefined" || dateString === "") {
    return "—";
  }
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn("⚠️ Invalid date string:", dateString);
      return "—";
    }
    
    // Use Intl.DateTimeFormat for Greece timezone with 24-hour format
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Athens',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false  // CHANGE THIS LINE: false for 24-hour format
    });
    
    const formatted = formatter.format(date);

    const hours = parseInt(formatted.split(':')[0]);
      return hours >= 12 ? `${formatted}pm` : `${formatted}am`;
    
    // The formatter will return "22:24" format
    return formatted;
  } catch (error) {
    console.error("❌ Error formatting Greece time:", error);
    
    // Fallback: Show local time with 24-hour format
    try {
      const date = new Date(dateString);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes} (Local)`;
    } catch {
      return "—";
    }
  }
};

/**
 * Format date in Greece timezone
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date in Greece timezone
 */
export const formatDateInGreece = (dateString) => {
  if (!dateString || dateString === "null" || dateString === "undefined" || dateString === "") {
    return "—";
  }
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn("⚠️ Invalid date string:", dateString);
      return "—";
    }
    
    // Use Intl.DateTimeFormat for Greece timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Athens',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error("❌ Error formatting Greece date:", error);
    
    // Fallback to simple formatting
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "—";
    }
  }
};