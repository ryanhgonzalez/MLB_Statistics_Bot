// Format start time in CT and return hour bucket (e.g. "6 PM")
export function formatToHourBucket(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = 
  { 
    hour: "numeric", 
    hour12: true, 
    timeZone: "America/Chicago" 
  };
  return new Intl.DateTimeFormat("en-US", options).format(date); // e.g. "6 PM"
}

// Format start time in CT and return exact time (e.g. "6:35 PM")
export function formatToChicagoTime(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = 
  { 
    hour: "numeric", 
    minute: "2-digit", 
    hour12: true, 
    timeZone: "America/Chicago" 
  };
  return new Intl.DateTimeFormat("en-US", options).format(date);
}