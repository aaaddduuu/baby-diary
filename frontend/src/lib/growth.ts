const GRAMS_TO_KILOGRAMS = 1000;
const WEIGHT_GRAMS_THRESHOLD = 100;

function trimTrailingZeros(value: string): string {
  return value.replace(/\.?0+$/, "");
}

export function formatMeasurementNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  const safeDigits = Math.max(0, digits);
  return trimTrailingZeros(value.toFixed(safeDigits));
}

export function normalizeWeightKg(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const normalized = Math.abs(value) >= WEIGHT_GRAMS_THRESHOLD ? value / GRAMS_TO_KILOGRAMS : value;
  return Math.round(normalized * GRAMS_TO_KILOGRAMS) / GRAMS_TO_KILOGRAMS;
}

export function formatWeightKg(value: number | null | undefined): string {
  const normalized = normalizeWeightKg(value);
  if (normalized === null) return "--";
  return `${formatMeasurementNumber(normalized, 3)}kg`;
}

export function getWeightInputValue(value: number | null | undefined): string {
  const normalized = normalizeWeightKg(value);
  if (normalized === null) return "";
  return formatMeasurementNumber(normalized, 3);
}

export type ParsedWeightInputMode = "kg" | "g" | "auto-grams" | null;

export interface ParsedWeightInput {
  kg: number | null;
  mode: ParsedWeightInputMode;
  rawNumber: number | null;
}

export function parseWeightInput(raw: string): ParsedWeightInput {
  const value = raw.trim().toLowerCase();
  if (!value) return { kg: null, mode: null, rawNumber: null };

  const compact = value.replace(/\s+/g, "");
  const isKilograms = compact.includes("kg") || compact.includes("千克");
  const isGrams = !isKilograms && (compact.includes("g") || compact.includes("克"));
  const numeric = Number(compact.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { kg: null, mode: null, rawNumber: null };
  }

  if (isKilograms) {
    return { kg: normalizeWeightKg(numeric), mode: "kg", rawNumber: numeric };
  }

  if (isGrams) {
    return { kg: normalizeWeightKg(numeric / GRAMS_TO_KILOGRAMS), mode: "g", rawNumber: numeric };
  }

  if (numeric >= WEIGHT_GRAMS_THRESHOLD) {
    return { kg: normalizeWeightKg(numeric), mode: "auto-grams", rawNumber: numeric };
  }

  return { kg: normalizeWeightKg(numeric), mode: "kg", rawNumber: numeric };
}
