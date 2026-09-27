/**
 * How CasePilot writes a day.
 *
 * `27 September 2026`, with the month spelled: `27/09/2026` and `09/27/2026` are the same string to a
 * machine and opposite facts to a reader, and CasePilot's audit trail is worth more than two
 * characters of width. One locale on purpose — a date rendered on the server in the *browser's* locale
 * would differ from the HTML React expects, and when a Project started is a fact rather than a
 * personalisation.
 */
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  // UTC, explicitly. Without it the day depends on the timezone of whatever rendered it: these pages
  // are server-rendered, so a deployment in one region and a reader in another would disagree about
  // when somebody joined, and two deployments would disagree with each other. A timestamp near
  // midnight can therefore read a day out for somebody far from UTC — which is the smaller of the two
  // problems, and the one that stays the same every time it is read.
  timeZone: "UTC",
});

export function formatDay(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  // `Invalid Date` is a JavaScript detail, and a timestamp that cannot be read is worth saying plainly
  // rather than passing through to a page.
  if (Number.isNaN(date.getTime())) return "Unknown";

  return DAY.format(date);
}
