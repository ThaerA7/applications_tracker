/**
 * Shared filter utility functions
 */

/**
 * Toggle a value in an array (add if not present, remove if present)
 */
export function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

/**
 * Normalize a list of values: trim, deduplicate, sort
 */
export function normalizeList(values: (string | undefined | null)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const s = (v ?? "").trim();
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Summarize a selection for display
 * @param values - Selected values
 * @param getLabel - Optional function to get display label for a value
 * @param emptyLabel - Label to show when nothing is selected
 */
export function summarizeSelection(
  values: string[],
  getLabel: (v: string) => string = (v) => v,
  emptyLabel = "Any"
): string {
  if (values.length === 0) return emptyLabel;
  if (values.length === 1) return getLabel(values[0]);
  if (values.length === 2) return `${getLabel(values[0])}, ${getLabel(values[1])}`;
  return `${getLabel(values[0])}, ${getLabel(values[1])} +${values.length - 2}`;
}
