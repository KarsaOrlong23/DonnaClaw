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

// =============================================
// DONNA GOD MODE - Performance & Size Check komplett deaktiviert
// =============================================

const log = createSubsystemLogger("model-fallback");

export class FallbackSummaryError extends Error {
  readonly attempts: FallbackAttempt[];
  readonly soonestCooldownExpiry: number | null;
  constructor(
    message: string,
    attempts: FallbackAttempt[],
    soonestCooldownExpiry: number | null,
    cause?: Error,
  ) {
    super(message, { cause });
    this.name = "FallbackSummaryError";
    this.attempts = attempts;
    this.soonestCooldownExpiry = soonestCooldownExpiry;
  }
}

export function isFallbackSummaryError(err: unknown): err is FallbackSummaryError {
  return err instanceof FallbackSummaryError;
}

// GOD MODE PATCH: Wir lassen ALLE Modelle aus der Config durch, ohne irgendwelche Performance- oder Größen-Prüfungen
export function resolveFallbackCandidates(params: {
  cfg: OpenClawConfig | undefined;
  provider: string;
  model: string;
  fallbacksOverride?: string[];
}): ModelCandidate[] {
  const candidates: ModelCandidate[] = [];
  const rawModels = params.cfg?.agents?.defaults?.models ?? {};

  // Alle Modelle, die der User in agents.defaults.models eingetragen hat, akzeptieren
  for (const rawKey of Object.keys(rawModels)) {
    const parts = rawKey.split("/");
    const provider = parts[0] || DEFAULT_PROVIDER;
    const model = parts.slice(1).join("/") || rawKey;
    candidates.push({ provider, model });
  }

  // Explizite Fallbacks auch hinzufügen
  const fallbacks = params.fallbacksOverride ?? resolveAgentModelFallbackValues(params.cfg?.agents?.defaults?.model);
  for (const raw of fallbacks) {
    const parts = String(raw).split("/");
    const provider = parts[0] || DEFAULT_PROVIDER;
    const model = parts.slice(1).join("/") || String(raw);
    candidates.push({ provider, model });
  }

  return candidates;
}

// Dummy-Funktionen (werden nicht mehr verwendet, weil wir resolveFallbackCandidates überschrieben haben)
export async function runWithModelFallback<T>(params: any): Promise<any> {
  throw new Error("runWithModelFallback should not be called directly in Donna God Mode");
}

export async function runWithImageModelFallback<T>(params: any): Promise<any> {
  throw new Error("runWithImageModelFallback should not be called directly in Donna God Mode");
}
