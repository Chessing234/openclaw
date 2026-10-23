import type { OpenClawPluginApi } from "../api.js";
import type { VoiceCallConfig } from "./config.js";

export function resolveVoiceResponseModel(params: {
  voiceConfig: VoiceCallConfig;
  agentRuntime: OpenClawPluginApi["runtime"]["agent"];
  /** The call agent's configured model. Compiled runtime defaults are only a last resort. */
  configuredModel?: { provider: string; model: string };
}): {
  provider: string;
  model: string;
} {
  const fallback = params.configuredModel ?? {
    provider: params.agentRuntime.defaults.provider,
    model: params.agentRuntime.defaults.model,
  };
  const modelRef =
    params.voiceConfig.responseModel ?? `${fallback.provider}/${fallback.model}`;
  const slashIndex = modelRef.indexOf("/");

  return {
    provider: slashIndex === -1 ? fallback.provider : modelRef.slice(0, slashIndex),
    model: slashIndex === -1 ? modelRef : modelRef.slice(slashIndex + 1),
  };
}
