
export async function readSSE(response, handlers = {}) {
  if (!response.body) {
    throw new Error("Sunucu akışı desteklemiyor.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split(/\r?\n/);
        let eventName = "message";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            data += line.slice(5).trim();
          }
        }

        if (!data) continue;

        if (data === "[DONE]") {
          continue;
        }

        let parsed;

        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = { text: data };
        }

        const type = parsed.type || parsed.event || eventName;

        if (type === "chunk" || parsed.text) {
          handlers.chunk?.({
            text: parsed.text || ""
          });
        } else if (type === "done") {
          handlers.done?.(parsed);
        } else if (type === "error") {
          handlers.error?.({
            message: parsed.message || parsed.error || "Akış hatası."
          });
        }
      }
    }

    if (buffer.trim()) {
      const data = buffer.replace(/^data:\s*/, "").trim();

      if (data && data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);

          if (parsed.type === "done") {
            handlers.done?.(parsed);
          } else if (parsed.type === "error") {
            handlers.error?.({
              message: parsed.message || "Akış hatası."
            });
          } else if (parsed.text) {
            handlers.chunk?.({ text: parsed.text });
          }
        } catch {
          // Sonlandırılmamış SSE verisini yoksay.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
