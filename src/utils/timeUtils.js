// timeUtils.js
export const formatTime = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatDuration = (startTime, endTime) => {
  const duration = endTime - startTime;
  return formatTime(duration);
};

export const formatTimeInGreece = (dateString) => {
  if (!dateString) return "—";
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn("⚠️ Invalid date string:", dateString);
      return "Invalid time";
    }
    
    // Get time in Greece timezone (EET/EEST)
    const greeceTime = new Date(date.toLocaleString('en-US', {
      timeZone: 'Europe/Athens'
    }));
    
    // Extract hours and minutes
    let hours = greeceTime.getHours();
    const minutes = String(greeceTime.getMinutes()).padStart(2, "0");
    
    // Determine AM/PM
    const suffix = hours < 12 ? "am" : "pm";
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    
    const display = `${hours}:${minutes}${suffix}`;
    
    return display;
  } catch (error) {
    console.error("❌ Error formatting Greece time:", error);
    return dateString;
  }
};

/**
 * Format date in Greece timezone
 */
export const formatDateInGreece = (dateString) => {
  if (!dateString) return "—";
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      console.warn("⚠️ Invalid date string:", dateString);
      return "Invalid date";
    }
    
    // Format date in Greece timezone
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Europe/Athens'
    });
  } catch (error) {
    console.error("❌ Error formatting Greece date:", error);
    return dateString;
  }
};

/**
 * Format date and time in Greece timezone
 */
export const formatDateTimeInGreece = (dateString) => {
  const date = formatDateInGreece(dateString);
  const time = formatTimeInGreece(dateString);
  
  if (date === "—" || time === "—") return "—";
  
  return `${date} at ${time}`;
};

/**
 * Get debug info for time conversion
 */
export const debugTimeConversion = (dateString) => {
  if (!dateString) return { error: "No date provided" };
  
  try {
    const originalDate = new Date(dateString);
    const greeceTime = new Date(originalDate.toLocaleString('en-US', {
      timeZone: 'Europe/Athens'
    }));
    
    return {
      original: {
        iso: originalDate.toISOString(),
        local: originalDate.toString(),
        hoursUTC: originalDate.getUTCHours(),
        hoursLocal: originalDate.getHours()
      },
      greece: {
        iso: greeceTime.toISOString(),
        local: greeceTime.toString(),
        hours: greeceTime.getHours(),
        display: formatTimeInGreece(dateString)
      },
      timezone: 'Europe/Athens',
      isValid: !isNaN(originalDate.getTime())
    };
  } catch (error) {
    return { error: error.message };
  }
};