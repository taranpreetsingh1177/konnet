import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export const MODELS = {
    // Google Models
    "gemini-3-flash-preview": google,
    "gemini-2.5-flash-lite": google,
    "gemini-3-pro": google,

    // OpenAI Models
    "gpt-4o": openai,
    "gpt-4o-mini": openai,
    "gpt-3.5-turbo": openai,
} as const;

export type AIModelType = keyof typeof MODELS;

export function aiModel(modelId: AIModelType) {
    const provider = MODELS[modelId];
    if (!provider) {
        throw new Error(`Unsupported AI model ID: ${modelId}`);
    }
    return provider(modelId);
}
