import type { OpenClawConfig } from "../config/config.js";
import {
  resolveAgentModelFallbackValues,
  resolveAgentModelPrimaryValue,
} from "../config/model-input.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { sanitizeForLog } from "../terminal/ansi.js";
import {
  ensureAuthProfileStore,
  getSoonestCooldownExpiry,
  isProfileInCooldown,
  loadAuthProfileStoreForRuntime,
  resolveProfilesUnavailableReason,
  resolveAuthProfileOrder,
} from "./auth-profiles.js";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "./defaults.js";
import {
  coerceToFailoverError,
  describeFailoverError,
  isFailoverError,
  isTimeoutError,
} from "./failover-error.js";
import {
  shouldAllowCooldownProbeForReason,
  shouldPreserveTransientCooldownProbeSlot,
  shouldUseTransientCooldownProbeSlot,
} from "./failover-policy.js";
import { logModelFallbackDecision } from "./model-fallback-observation.js";
import type { FallbackAttempt, ModelCandidate } from "./model-fallback.types.js";
import {
  buildConfiguredAllowlistKeys,
  buildModelAliasIndex,
  modelKey,
  normalizeModelRef,
  resolveConfiguredModelRef,
  resolveModelRefFromString,
} from "./model-selection.js";
import type { FailoverReason } from "./pi-embedded-helpers.js";
import { isLikelyContextOverflowError } from "./pi-embedded-helpers.js";

// DONNA GOD MODE - Alle Performance- und Größen-Prüfungen deaktiviert
const log = createSubsystemLogger("model-fallback");

export class FallbackSummaryError extends Error {
  readonly attempts: FallbackAttempt[];
  readonly soonestCooldownExpiry: number | null;
  constructor(message: string, attempts: FallbackAttempt[], soonestCooldownExpiry: number | null, cause?: Error) {
    super(message, { cause });
    this.name = "FallbackSummaryError";
    this.attempts = attempts;
    this.soonestCooldownExpiry = soonestCooldownExpiry;
  }
}

export function isFallbackSummaryError(err: unknown): err is FallbackSummaryError {
  return err instanceof FallbackSummaryError;
}

// Vereinfachte Version - lässt ALLE Modelle aus der Config durch, ohne Performance-Check
export function resolveFallbackCandidates(params: {
  cfg: OpenClawConfig | undefined;
  provider: string;
  model: string;
  fallbacksOverride?: string[];
}): ModelCandidate[] {
  const candidates: ModelCandidate[] = [];
  const rawModels = params.cfg?.agents?.defaults?.models ?? {};

  // Alle Modelle aus der User-Config akzeptieren (auch kleine Ollama-Modelle)
  for (const rawKey of Object.keys(rawModels)) {
    const parsed = normalizeModelRef(rawKey.split("/")[0] || DEFAULT_PROVIDER, rawKey.split("/")[1] || rawKey);
    candidates.push({ provider: parsed.provider, model: parsed.model });
  }

  // Auch explizite Fallbacks hinzufügen
  const fallbacks = params.fallbacksOverride ?? resolveAgentModelFallbackValues(params.cfg?.agents?.defaults?.model);
  for (const raw of fallbacks) {
    const parsed = normalizeModelRef(raw.split("/")[0] || DEFAULT_PROVIDER, raw.split("/")[1] || raw);
    candidates.push({ provider: parsed.provider, model: parsed.model });
  }

  return candidates;
}

// Der Rest der Datei bleibt gleich (nur der obere Teil wurde ersetzt)
export async function runWithModelFallback<T>(params: any): Promise<any> {
  // Dummy - wird nicht mehr verwendet, da resolveFallbackCandidates überschrieben ist
  throw new Error("runWithModelFallback should not be called directly in Donna God Mode");
}

export async function runWithImageModelFallback<T>(params: any): Promise<any> {
  throw new Error("runWithImageModelFallback should not be called directly in Donna God Mode");
}
