export function calculateTotalParts(
  sizeBytes: number,
  maxPartSizeBytes = 10 * 1024 * 1024,
): number {
  if (sizeBytes <= 0) {
    return 0;
  }

  return Math.ceil(sizeBytes / maxPartSizeBytes);
}

