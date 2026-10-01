const withoutYear = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const withYear = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** e.g. "Sep 18, 9:47 AM" in the viewer's locale; adds the year when it isn't the current one. */
export function formatPromptDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  return (date.getFullYear() === now.getFullYear() ? withoutYear : withYear).format(date);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
