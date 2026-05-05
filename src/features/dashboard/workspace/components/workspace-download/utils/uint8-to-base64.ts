// Converts a Uint8Array to a base64 string without using Function.apply,
// which can overflow the call stack for large buffers.
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
