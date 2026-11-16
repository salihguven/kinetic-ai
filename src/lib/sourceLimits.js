export const MAX_NOTE_FILE_BYTES = 256 * 1024;
export const MAX_NOTE_SOURCE_CHARACTERS = 20_000;
export const MAX_NOTE_CONTEXT_CHARACTERS = 28_000;
export const MAX_NOTE_SOURCES = 12;

export function getTextMetrics(value = "") {
  const text = String(value);
  return {
    characters: [...text].length,
    bytes: new TextEncoder().encode(text).byteLength,
  };
}
