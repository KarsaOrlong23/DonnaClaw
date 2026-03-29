import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { DEFAULT_PROVIDER } from "./defaults.js";
import {
  resolveAgentModelFallbackValues,
} from "../config/model-input.js";
import {
  normalizeModelRef,
} from "./model-selection.js";
import type { ModelCandidate } from "./model-fallback.types.js";

// DONNA GOD MODE - Performance-Check komplett ausgeschaltet
const log = createSubsystemLogger("model-fallback");

export function resolveFallbackCandidates(params: {
  cfg: OpenClawConfig | undefined;
  provider: string;
  model: string;
  fallbacksOverride?: string[];
}): ModelCandidate[] {
  const candidates: ModelCandidate[] = [];
  const rawModels = params.cfg?.agents?.defaults?.models ?? {};

  // Alle Modelle aus der Config akzeptieren (auch kleine Dolphin & Qwen)
  for (const rawKey of Object.keys(rawModels)) {
    const parts = rawKey.split("/");
    const provider = parts[0] || DEFAULT_PROVIDER;
    const model = parts.slice(1).join("/") || rawKey;
    candidates.push({ provider, model });
  }

  // Fallbacks auch hinzufügen
  const fallbacks = params.fallbacksOverride ?? resolveAgentModelFallbackValues(params.cfg?.agents?.defaults?.model);
  for (const raw of fallbacks) {
    const parts = String(raw).split("/");
    const provider = parts[0] || DEFAULT_PROVIDER;
    const model = parts.slice(1).join("/") || String(raw);
    candidates.push({ provider, model });
  }

  return candidates;
}

// Dummy-Funktionen, damit nichts kaputt geht
export async function runWithModelFallback<T>(params: any): Promise<any> {
  throw new Error("runWithModelFallback disabled in Donna God Mode");
}

export async function runWithImageModelFallback<T>(params: any): Promise<any> {
  throw new Error("runWithImageModelFallback disabled in Donna God Mode");
}
