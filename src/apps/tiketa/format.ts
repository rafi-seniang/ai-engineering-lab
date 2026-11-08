import type { Movie } from "../../api/tiketa";

/** The cinema's clock. Showtimes come in UTC and are shown, and grouped into days, in Jakarta time. */
export const CINEMA_TIMEZONE = "Asia/Jakarta";
export const DAYS_SHOWN = 7;

const rupiahFormat = new Intl.NumberFormat("id-ID");
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: CINEMA_TIMEZONE, hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: CINEMA_TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const isoDayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: CINEMA_TIMEZONE });

export const rupiah = (amount: number) => `Rp${rupiahFormat.format(amount)}`;
export const clockTime = (iso: string) => timeFormat.format(new Date(iso));
export const dayLabel = (iso: string) => dayFormat.format(new Date(iso));
export const whenLabel = (iso: string) => `${dayLabel(iso)}, ${clockTime(iso)} WIB`;
/** The cinema day (YYYY-MM-DD in Jakarta) a moment falls on. */
export const cinemaDay = (iso: string) => isoDayFormat.format(new Date(iso));

/** The next days as YYYY-MM-DD in Jakarta, starting today, with a short label for each. */
export function cinemaDays(now = new Date()): { day: string; weekday: string; date: string }[] {
  return Array.from({ length: DAYS_SHOWN }, (_, offset) => {
    const moment = new Date(now.getTime() + offset * 86_400_000);
    const parts = Object.fromEntries(dayFormat.formatToParts(moment).map((part) => [part.type, part.value]));
    return {
      day: isoDayFormat.format(moment),
      weekday: offset === 0 ? "Today" : (parts.weekday ?? ""),
      date: `${parts.day} ${parts.month}`,
    };
  });
}

/** A poster at the size the screen shows it: the full-size originals are 1 to 3 MB each. */
export function posterAt(movie: Movie, width: number): string | null {
  const url = movie.poster_url;
  if (!url) return null;
  if (url.includes("image.tmdb.org")) return url.replace("/original/", width <= 185 ? "/w185/" : "/w342/");
  if (url.includes("images.weserv.nl")) return `${url}&w=${width}&h=${Math.round(width * 1.5)}&fit=cover&output=webp`;
  return url;
}
