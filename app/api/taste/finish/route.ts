import { NextResponse } from 'next/server';

import {
  ArtworkEmbedding,
  TasteFinishRequest,
  TasteFinishResponse,
  TastePreferenceVectors,
  TASTE_COLOR_OPTIONS,
  TASTE_MEDIUM_OPTIONS,
  TASTE_STYLE_OPTIONS,
} from '@/types/taste';
import {
  completeTasteSession,
  getTasteSession,
} from '../session-store';
import { l2Normalize } from '@/app/lib/taste/math';
import { DEFAULT_WEIGHTS, scoreArtworks, sortArtworkScores } from '@/app/lib/taste/scoring';
import { getUserByClerkId, updateUserPreferences } from '@/app/db/user-utils';
import { buildMockEmbeddings } from '@/app/lib/taste/mock-data';

const LEARNING_RATE = 0.05;
const L2_DECAY = 1e-4;

interface PersistTastePayload {
  userId: string;
  selections: {
    colors: string[];
    mediums: string[];
    styles: string[];
  };
  summary: TasteFinishResponse['summary'];
  userVector: number[];
  weights: TasteFinishResponse['weights'];
  telemetry: TasteFinishRequest['telemetry'];
}

function toNormalizedVector<T extends string>(options: readonly T[], selections: T[]): number[] {
  const selectionSet = new Set(selections);
  const vector = options.map(option => (selectionSet.has(option) ? 1 : 0));
  return l2Normalize(vector);
}

function buildPreferenceVectors(body: TasteFinishRequest): TastePreferenceVectors {
  return {
    colors: { values: toNormalizedVector(TASTE_COLOR_OPTIONS, body.colors) },
    mediums: { values: toNormalizedVector(TASTE_MEDIUM_OPTIONS, body.mediums) },
    styles: { values: toNormalizedVector(TASTE_STYLE_OPTIONS, body.styles) },
  };
}

function updateUserVector(
  baseVector: number[],
  winner: number[],
  loser: number[],
): number[] {
  const next = [...baseVector];
  for (let i = 0; i < next.length; i += 1) {
    const gradient = (winner[i] ?? 0) - (loser[i] ?? 0);
    next[i] = next[i] * (1 - L2_DECAY) + LEARNING_RATE * gradient;
  }
  return next;
}

function computeUserEmbeddingVector(
  embeddings: ArtworkEmbedding[],
  history: TasteFinishRequest['pairs'],
): number[] {
  const embeddingMap = new Map(embeddings.map(embedding => [embedding.id, embedding]));
  const vectorLength = embeddings[0]?.clipVector.length ?? 0;
  let userVector = Array.from({ length: vectorLength }, () => 0);

  history.forEach(choice => {
    if (choice.skipped) {
      return;
    }
    const winner = embeddingMap.get(choice.winnerId);
    const loser = embeddingMap.get(choice.loserId);
    if (!winner || !loser) {
      return;
    }
    userVector = updateUserVector(userVector, winner.clipVector, loser.clipVector);
  });

  return userVector;
}

function deriveTopSelections<T>(items: T[], limit: number): T[] {
  return items.slice(0, limit);
}

function computeStability(history: TasteFinishRequest['pairs']): number {
  if (history.length < 2) {
    return 1;
  }
  const recent = history.slice(-2);
  return recent.every(choice => !choice.skipped) ? 0.6 : 0.2;
}

async function persistTasteCompletion({
  userId,
  selections,
  summary,
  userVector,
  weights,
  telemetry,
}: PersistTastePayload) {
  try {
    const existingUser = await getUserByClerkId(userId);
    let preferences: Record<string, unknown> = {};

    if (existingUser?.uiPreferences) {
      try {
        preferences = JSON.parse(existingUser.uiPreferences) ?? {};
      } catch (error) {
        console.warn('Unable to parse stored uiPreferences. Resetting.', error);
        preferences = {};
      }
    }

    preferences.tasteTest = {
      completed: true,
      completedAt: new Date().toISOString(),
      selections,
      summary,
      userVector,
      weights,
      telemetry,
    };

    await updateUserPreferences(userId, {
      uiPreferences: JSON.stringify(preferences),
    });
  } catch (error) {
    console.error('Failed to persist taste completion state:', error);
  }
}

export async function POST(request: Request): Promise<NextResponse<TasteFinishResponse | { error: string }>> {
  let body: TasteFinishRequest;
  try {
    body = (await request.json()) as TasteFinishRequest;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body.sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  const session = getTasteSession(body.sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 });
  }

  const preferences = buildPreferenceVectors(body);
  const embeddings = session.candidates?.length
    ? session.candidates
    : buildMockEmbeddings(session.candidateIds);

  const userVector = computeUserEmbeddingVector(embeddings, body.pairs);
  const scoringContext = {
    userVector,
    priorVectors: preferences,
    weights: DEFAULT_WEIGHTS,
  };
  const scores = sortArtworkScores(scoreArtworks(embeddings, scoringContext)).slice(0, 12);

  completeTasteSession(session.sessionId, body.telemetry);

  const topStyles = deriveTopSelections(body.styles, 3);
  const topMediums = deriveTopSelections(body.mediums, 2);
  const palette = deriveTopSelections(body.colors, 3);
  const recommendedArtworkIds = scores.map(result => result.artworkId);
  const facets = {
    styles: [...new Set([...topStyles, ...body.styles])],
    mediums: [...new Set([...topMediums, ...body.mediums])],
    colors: [...new Set([...palette, ...body.colors])],
  };
  const stabilityScore = computeStability(body.pairs);
  const refineSuggested = stabilityScore < 0.3;

  const summary: TasteFinishResponse['summary'] = {
    topStyles,
    topMediums,
    palette,
    recommendedArtworkIds,
    facets,
    stabilityScore,
    refineSuggested,
  };

  const weights = {
    wEmbed: DEFAULT_WEIGHTS.w1,
    wAttr: DEFAULT_WEIGHTS.w2,
  } as const;

  await persistTasteCompletion({
    userId: session.userId,
    selections: {
      colors: body.colors,
      mediums: body.mediums,
      styles: body.styles,
    },
    summary,
    userVector,
    weights,
    telemetry: body.telemetry,
  });

  const response: TasteFinishResponse = {
    sessionId: session.sessionId,
    summary,
    userVector,
    weights,
  };

  return NextResponse.json(response);
}


