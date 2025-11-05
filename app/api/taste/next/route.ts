import { NextResponse } from 'next/server';

import {
  ArtworkEmbedding,
  TasteNextRequest,
  TasteNextResponse,
  TastePairChoice,
  TasteStyle,
} from '@/types/taste';
import { selectNextPair } from '@/app/lib/taste/selection';
import {
  getTasteSession,
  setPairHistory,
  setSessionCandidates,
} from '../session-store';
import { fetchCandidateEmbeddingsForStyles } from '@/app/lib/taste/artworks';
import { buildMockEmbeddings } from '@/app/lib/taste/mock-data';

const TOTAL_ROUNDS = 7;
const REQUIRED_UNIQUE_STYLES = 3;
const DEFAULT_CANDIDATE_COUNT = 90;

function buildExposureCounts(history: TastePairChoice[]): Record<string, number> {
  return history.reduce<Record<string, number>>((acc, choice) => {
    acc[choice.winnerId] = (acc[choice.winnerId] ?? 0) + 1;
    acc[choice.loserId] = (acc[choice.loserId] ?? 0) + 1;
    return acc;
  }, {});
}

function buildSeenSets(
  history: TastePairChoice[],
  embeddingMap: Map<string, ArtworkEmbedding>,
) {
  const seenStyles = new Set<TasteStyle>();
  const seenArtists = new Set<string>();

  history.forEach(choice => {
    const winner = embeddingMap.get(choice.winnerId);
    const loser = embeddingMap.get(choice.loserId);
    if (winner) {
      winner.styles.forEach(style => seenStyles.add(style));
      seenArtists.add(winner.artistId);
    }
    if (loser) {
      loser.styles.forEach(style => seenStyles.add(style));
      seenArtists.add(loser.artistId);
    }
  });

  return { seenStyles, seenArtists };
}

function haveStylesChanged(existing: TasteStyle[] | undefined, incoming: TasteStyle[]): boolean {
  if (!incoming.length) {
    return false;
  }
  if (!existing || existing.length !== incoming.length) {
    return true;
  }
  const existingSet = new Set(existing);
  return incoming.some(style => !existingSet.has(style));
}

function toPairArtwork(embedding: ArtworkEmbedding) {
  return {
    id: embedding.id,
    title: embedding.title ?? 'Untitled',
    artistTitle: embedding.artistTitle ?? null,
    imageUrl: embedding.imageUrl ?? null,
    styles: embedding.styles,
    styleTitles: embedding.styleTitles,
  } as const;
}

export async function POST(request: Request): Promise<NextResponse<TasteNextResponse | { error: string }>> {
  let body: TasteNextRequest;
  try {
    body = (await request.json()) as TasteNextRequest;
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

  const history = body.history ?? [];
  const updated = setPairHistory(session.sessionId, history);
  if (!updated) {
    return NextResponse.json({ error: 'Failed to update session history' }, { status: 500 });
  }

  const styles = body.styles ?? updated.selectedStyles ?? [];

  let candidateEmbeddings: ArtworkEmbedding[] | undefined = updated.candidates;

  if (!candidateEmbeddings || haveStylesChanged(updated.selectedStyles, styles)) {
    try {
      const fetched = await fetchCandidateEmbeddingsForStyles(styles, DEFAULT_CANDIDATE_COUNT);
      candidateEmbeddings = fetched;
      const refreshed = setSessionCandidates(session.sessionId, fetched, styles);
      if (refreshed) {
        candidateEmbeddings = refreshed.candidates ?? fetched;
      }
    } catch (error) {
      console.error('Failed to fetch candidate artworks:', error);
      candidateEmbeddings = buildMockEmbeddings(updated.candidateIds);
    }
  }

  if (!candidateEmbeddings || candidateEmbeddings.length < 2) {
    candidateEmbeddings = buildMockEmbeddings(updated.candidateIds);
  }

  const embeddingMap = new Map<string, ArtworkEmbedding>(candidateEmbeddings.map(embedding => [embedding.id, embedding]));
  const exposureCounts = buildExposureCounts(history);
  const { seenStyles, seenArtists } = buildSeenSets(history, embeddingMap);
  const lastChoice = history.at(-1);
  const lastArtistId = lastChoice ? embeddingMap.get(lastChoice.winnerId)?.artistId : undefined;

  const uncertainty = candidateEmbeddings.reduce<Record<string, number>>((acc, embedding) => {
    const exposure = exposureCounts[embedding.id] ?? 0;
    acc[embedding.id] = 1 / (1 + exposure);
    return acc;
  }, {});

  const selection = selectNextPair({
    round: history.length + 1,
    totalRounds: TOTAL_ROUNDS,
    candidatePool: candidateEmbeddings,
    exposureCounts,
    uncertainty,
    lastArtistId,
    requiredUniqueStyles: REQUIRED_UNIQUE_STYLES,
    seenStyles,
    seenArtists,
  });

  if (!selection) {
    return NextResponse.json({ error: 'Unable to generate next pair with current candidates' }, { status: 409 });
  }

  const skipCount = history.filter(choice => choice.skipped).length;
  const allowSkip = skipCount < 1;

  const artworkA = embeddingMap.get(selection.artworkAId);
  const artworkB = embeddingMap.get(selection.artworkBId);

  if (!artworkA || !artworkB) {
    return NextResponse.json({ error: 'Selected artworks missing from candidate pool' }, { status: 500 });
  }

  const response: TasteNextResponse = {
    sessionId: session.sessionId,
    round: history.length + 1,
    totalRounds: TOTAL_ROUNDS,
    pair: {
      artworkA: toPairArtwork(artworkA),
      artworkB: toPairArtwork(artworkB),
      allowSkip,
    },
  };

  return NextResponse.json(response);
}


