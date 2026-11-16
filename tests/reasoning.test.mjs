import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReasoningOptions,
  getReasoningSupport,
  normalizeReasoningLevel,
} from "../src/lib/reasoning.js";

test("reasoning settings are bounded and only emitted for known compatible models", () => {
  assert.equal(normalizeReasoningLevel("root"), "auto");
  assert.equal(getReasoningSupport({ type: "openai-compatible", baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.1-8b-instruct" }), "unsupported");
  assert.deepEqual(buildReasoningOptions({ type: "openai-compatible", baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.1-8b-instruct" }, "high"), {});
});

test("provider reasoning payloads use their respective documented fields", () => {
  assert.deepEqual(buildReasoningOptions({ type: "gemini", model: "gemini-2.5-flash" }, "high"), {
    generationConfig: { thinkingConfig: { thinkingLevel: "HIGH" } },
  });
  assert.deepEqual(buildReasoningOptions({ type: "openai-compatible", baseUrl: "https://openrouter.ai/api/v1", model: "deepseek/deepseek-r1" }, "medium"), {
    reasoning: { effort: "medium" },
  });
  assert.deepEqual(buildReasoningOptions({ type: "openai-compatible", baseUrl: "https://api.openai.com/v1", model: "o3" }, "low"), {
    reasoning_effort: "low",
  });
  assert.deepEqual(buildReasoningOptions({ type: "anthropic", baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4.6" }, "high"), {
    thinking: { type: "adaptive" }, output_config: { effort: "high" },
  });
});
