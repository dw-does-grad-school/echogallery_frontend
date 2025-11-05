import {
  ArtworkEmbedding,
  TastePairChoice,
  TastePreferenceVectors,
  TasteSessionTelemetry,
  TasteStyle,
  TASTE_COLOR_DIMENSION,
  TASTE_MEDIUM_DIMENSION,
  TASTE_STYLE_DIMENSION,
} from '@/types/taste';

export interface TasteSessionRecord {
  sessionId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  candidateIds: string[];
  preferences: TastePreferenceVectors;
  history: TastePairChoice[];
  telemetry?: TasteSessionTelemetry;
  selectedStyles?: TasteStyle[];
  candidates?: ArtworkEmbedding[];
}

const SESSION_TTL_MINUTES = 30;

declare global {
  // eslint-disable-next-line no-var
  var __tasteSessions: Map<string, TasteSessionRecord> | undefined;
}

const tasteSessions: Map<string, TasteSessionRecord> = globalThis.__tasteSessions ?? new Map();

if (!globalThis.__tasteSessions) {
  globalThis.__tasteSessions = tasteSessions;
}

function createZeroVector(length: number): number[] {
  return Array.from({ length }, () => 0);
}

export function createEmptyPreferenceVectors(): TastePreferenceVectors {
  return {
    colors: { values: createZeroVector(TASTE_COLOR_DIMENSION) },
    mediums: { values: createZeroVector(TASTE_MEDIUM_DIMENSION) },
    styles: { values: createZeroVector(TASTE_STYLE_DIMENSION) },
  };
}

export function createTasteSession(
  sessionId: string,
  userId: string,
  candidateIds: string[],
  preferences: TastePreferenceVectors,
): TasteSessionRecord {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60 * 1000).toISOString();

  const record: TasteSessionRecord = {
    sessionId,
    userId,
    createdAt,
    expiresAt,
    candidateIds,
    preferences,
    history: [],
  };

  tasteSessions.set(sessionId, record);
  return record;
}

export function getTasteSession(sessionId: string): TasteSessionRecord | undefined {
  const record = tasteSessions.get(sessionId);
  if (!record) {
    return undefined;
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    tasteSessions.delete(sessionId);
    return undefined;
  }
  return record;
}

export function updateTasteSession(record: TasteSessionRecord): void {
  tasteSessions.set(record.sessionId, record);
}

export function appendPairChoices(sessionId: string, choices: TastePairChoice[]): TasteSessionRecord | undefined {
  const record = getTasteSession(sessionId);
  if (!record) {
    return undefined;
  }
  record.history = [...record.history, ...choices];
  updateTasteSession(record);
  return record;
}

export function setPairHistory(sessionId: string, choices: TastePairChoice[]): TasteSessionRecord | undefined {
  const record = getTasteSession(sessionId);
  if (!record) {
    return undefined;
  }
  record.history = choices;
  updateTasteSession(record);
  return record;
}

export function completeTasteSession(
  sessionId: string,
  telemetry: TasteSessionTelemetry,
): TasteSessionRecord | undefined {
  const record = getTasteSession(sessionId);
  if (!record) {
    return undefined;
  }
  record.telemetry = telemetry;
  updateTasteSession(record);
  return record;
}

export function setSessionCandidates(
  sessionId: string,
  candidates: ArtworkEmbedding[],
  selectedStyles: TasteStyle[],
): TasteSessionRecord | undefined {
  const record = getTasteSession(sessionId);
  if (!record) {
    return undefined;
  }
  record.candidates = candidates;
  record.candidateIds = candidates.map(candidate => candidate.id);
  record.selectedStyles = selectedStyles;
  updateTasteSession(record);
  return record;
}


