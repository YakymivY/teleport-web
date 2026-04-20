export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

export function calculateTotalParts(
  sizeBytes: number,
  maxPartSizeBytes = 10 * 1024 * 1024,
): number {
  if (sizeBytes <= 0) {
    return 0;
  }

  return Math.ceil(sizeBytes / maxPartSizeBytes);
}

