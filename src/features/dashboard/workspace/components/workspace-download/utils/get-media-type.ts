const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'heic', 'heif', 'bmp', 'tiff', 'tif', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'avi', 'mkv', 'm4v', '3gp']);

export function getMediaType(filename: string): 'image' | 'video' | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return null;
}