import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

import {
  TastePreferenceVectors,
  TasteStartRequest,
  TasteStartResponse,
} from '@/types/taste';
import {
  createEmptyPreferenceVectors,
  createTasteSession,
} from '../session-store';

const DEFAULT_CANDIDATE_IDS = Array.from({ length: 12 }, (_, index) => `art_${String(index + 1).padStart(3, '0')}`);

function mergePreferenceVectors(partial?: Partial<TastePreferenceVectors>): TastePreferenceVectors {
  const base = createEmptyPreferenceVectors();
  if (!partial) {
    return base;
  }
  return {
    colors: partial.colors ?? base.colors,
    mediums: partial.mediums ?? base.mediums,
    styles: partial.styles ?? base.styles,
  };
}

export async function POST(request: Request): Promise<NextResponse<TasteStartResponse | { error: string }>> {
  let body: TasteStartRequest;
  try {
    body = (await request.json()) as TasteStartRequest;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const sessionId = randomUUID();
  const preferenceVectors = mergePreferenceVectors(body.preferenceVectors);
  const candidateIds = [...DEFAULT_CANDIDATE_IDS];

  const record = createTasteSession(sessionId, body.userId, candidateIds, preferenceVectors);

  const response: TasteStartResponse = {
    sessionId: record.sessionId,
    candidateIds: record.candidateIds,
    expiresAt: record.expiresAt,
  };

  return NextResponse.json(response, { status: 201 });
}


