import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * One place that decides which AI provider powers IQ Copilot, Manager Assist
 * and the invoice reader. Configure with env vars:
 *
 *   AI_PROVIDER      openai | openrouter   (unset = AI features disabled)
 *   AI_API_KEY       provider API key
 *   AI_BASE_URL      optional override for any OpenAI-compatible endpoint
 *   AI_MODEL_CHAT    chat model id
 *   AI_MODEL_VISION  model id that can read images/PDFs (defaults to chat)
 *
 * Adding Anthropic later means installing @ai-sdk/anthropic and adding a case.
 */
type Provider = "openai" | "openrouter";

const BASE_URLS: Record<Provider, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI isn't set up for this workspace yet.");
    this.name = "AiNotConfiguredError";
  }
}

function readConfig() {
  const provider = process.env["AI_PROVIDER"]?.trim().toLowerCase();
  const apiKey = process.env["AI_API_KEY"]?.trim();
  const chatModel = process.env["AI_MODEL_CHAT"]?.trim();
  if (!apiKey || !chatModel || (provider !== "openai" && provider !== "openrouter")) return null;
  return {
    provider: provider as Provider,
    apiKey,
    baseURL: process.env["AI_BASE_URL"]?.trim() || BASE_URLS[provider as Provider],
    chatModel,
    visionModel: process.env["AI_MODEL_VISION"]?.trim() || chatModel,
  };
}

export function isAiConfigured() {
  return readConfig() !== null;
}

function model(kind: "chat" | "vision"): LanguageModel {
  const config = readConfig();
  if (!config) throw new AiNotConfiguredError();
  const client = createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  const id = kind === "chat" ? config.chatModel : config.visionModel;
  // OpenRouter and most compatible gateways speak Chat Completions; OpenAI itself gets the Responses API.
  return config.provider === "openai" && !process.env["AI_BASE_URL"]
    ? client.responses(id)
    : client.chat(id);
}

export const getChatModel = () => model("chat");
export const getVisionModel = () => model("vision");

/** Maps provider HTTP errors to a message we can show a restaurant manager. */
export function aiErrorMessage(
  error: unknown,
  fallback = "IQ couldn't answer right now. Please try again.",
) {
  if (error instanceof AiNotConfiguredError) return error.message;
  const status = (error as { statusCode?: number })?.statusCode;
  if (status === 401 || status === 403)
    return "The AI provider rejected our key. Check AI_API_KEY.";
  if (status === 402) return "The AI provider account is out of credit.";
  if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
  return fallback;
}
