/**
 * Formats a snow value (in mm) as a range string in cm
 * Examples:
 * - 1.5 → "0-2 cm"
 * - 5.7 → "5-10 cm"
 * - 28.7 → "20-30 cm"
 *
 * @param snowValueMm - Snow value in millimeters
 * @param cmUnit - The "cm" unit string from translations
 * @returns Formatted range string (e.g., "20-30 cm")
 */
export function formatSnowRange(snowValueMm: number, cmUnit: string): string {
  // Convert mm to cm (the value is already in mm, we just need to work with it)
  const valueCm = snowValueMm;

  let start: number;
  let end: number;

  if (valueCm < 2) {
    // For values less than 2 cm, use 0-2 range
    start = 0;
    end = 2;
  } else if (valueCm < 10) {
    // For values 2-10 cm, round to nearest 5
    start = Math.floor(valueCm / 5) * 5;
    end = Math.ceil(valueCm / 5) * 5;
    // Ensure minimum range of 5
    if (end - start < 5) {
      end = start + 5;
    }
  } else {
    // For values >= 10 cm, round to nearest 10
    start = Math.floor(valueCm / 10) * 10;
    end = Math.ceil(valueCm / 10) * 10;
    // Ensure minimum range of 10
    if (end - start < 10) {
      end = start + 10;
    }
  }

  return `${start}-${end} ${cmUnit}`;
}
