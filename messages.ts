interface Buckets {
  [key: string]: string[];
}

export function buildGameScheduleMessage(dateStr: string, buckets: Buckets): string {
  let message = `⚾ MLB Games for ${dateStr}\n\n`;

  const sortedBuckets = Object.keys(buckets).sort((a, b) => {
    const getHour = (t: string) => {
      const [hour, ampm] = t.split(" ");
      let h = parseInt(hour, 10);
      if (ampm === "PM" && h !== 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      return h;
    };
    return getHour(a) - getHour(b);
  });

  for (const bucket of sortedBuckets) {
    message += `🕒 ${bucket} CT\n`;
    message += buckets[bucket].join("\n") + "\n\n";
  }

  return message.trim();
}
