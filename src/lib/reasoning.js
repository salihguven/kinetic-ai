const LEVELS = new Set(["low", "medium", "high"]);

function hostOf(baseUrl) {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getReasoningSupport(provider) {
  if (!provider?.model) return "unsupported";
  const model = String(provider.model).toLowerCase();
  const host = hostOf(provider.baseUrl || "https://api.openai.com/v1");

  if (provider.type === "gemini" && /^gemini-(?:2\.5|3(?:\.|-|$))/.test(model)) {
    return "gemini";
  }
  if (provider.type === "openai-compatible") {
    if ((host === "openrouter.ai" || host.endsWith(".openrouter.ai")) &&
        /(?:^|\/)(?:o[1-4](?:[-/]|$)|gpt-5(?:[./-]|$)|deepseek-r1|qwq|qwen3.*thinking|kimi.*thinking|glm-.*(?:thinking|reason))/i.test(model)) {
      return "openrouter";
    }
    if (host === "api.openai.com" && /^(?:o[1-4](?:-|$)|gpt-5(?:[.-]|$))/i.test(model)) {
      return "openai";
    }
  }
  if (provider.type === "anthropic" && host === "api.anthropic.com" &&
      /^claude-(?:opus|sonnet)-4\.(?:6|7)(?:-|$)/i.test(model)) {
    return "anthropic-adaptive";
  }
  return "unsupported";
}

export function normalizeReasoningLevel(value) {
  return LEVELS.has(value) ? value : "auto";
}

export function buildReasoningOptions(provider, value) {
  const level = normalizeReasoningLevel(value);
  const support = getReasoningSupport(provider);
  if (level === "auto" || support === "unsupported") return {};

  if (support === "gemini") {
    return { generationConfig: { thinkingConfig: { thinkingLevel: level.toUpperCase() } } };
  }
  if (support === "openrouter") return { reasoning: { effort: level } };
  if (support === "openai") return { reasoning_effort: level };
  if (support === "anthropic-adaptive") {
    return { thinking: { type: "adaptive" }, output_config: { effort: level } };
  }
  return {};
}
