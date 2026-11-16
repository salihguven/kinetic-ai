export async function readApiJson(response, label) {
  let text;
  try {
    text = await response.text();
  } catch {
    throw new Error(label + ": sunucu yanıtı okunamadı (HTTP " + response.status + ").");
  }

  if (!text.trim()) {
    const message = label + ": sunucu boş yanıt verdi (HTTP " + response.status + ").";
    if (!response.ok) return { error: message };
    throw new Error(message);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const message = label + ": sunucu geçersiz JSON yanıtı verdi (HTTP " + response.status + ").";
    if (!response.ok) return { error: message };
    throw new Error(message);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const message = label + ": sunucu beklenen JSON biçimini döndürmedi (HTTP " + response.status + ").";
    if (!response.ok) return { error: message };
    throw new Error(message);
  }

  return data;
}
