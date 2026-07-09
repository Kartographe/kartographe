const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ["o", "Ko", "Mo", "Go"];

/** `1536` → `1,5 Ko`. */
export function formatFileSize(bytes: number, locale: string): string {
  let size = bytes;
  let unit = 0;
  while (size >= BYTES_PER_UNIT && unit < SIZE_UNITS.length - 1) {
    size /= BYTES_PER_UNIT;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(size);
  return `${formatted} ${SIZE_UNITS[unit]}`;
}
