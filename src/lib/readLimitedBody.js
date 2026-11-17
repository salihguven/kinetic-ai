export async function readLimitedBody(request, maxBytes) {
  const reader = request.body?.getReader();
  if (!reader) return { ok: true, text: "" };
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return { ok: false, error: "İstek boyutu izin verilen sınırı aşıyor." };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
    } catch {
      return { ok: false, error: "İstek metni UTF-8 biçiminde değil." };
    }
  } finally {
    reader.releaseLock();
  }
}
