import {
  ArtworkEmbedding,
  TastePairSelectionContext,
  TastePairSelectionResult,
} from '@/types/taste';
import { cosineSimilarity } from './math';

function randomElement<T>(items: T[]): T | undefined {
  if (!items.length) {
    return undefined;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function pickHighestUnderexposed(context: TastePairSelectionContext): ArtworkEmbedding | undefined {
  const exposureEntries = context.candidatePool.map(candidate => ({
    candidate,
    exposure: context.exposureCounts[candidate.id] ?? 0,
  }));

  if (!exposureEntries.length) {
    return undefined;
  }

  const minExposure = Math.min(...exposureEntries.map(entry => entry.exposure));
  const lowestExposure = exposureEntries.filter(entry => entry.exposure === minExposure).map(entry => entry.candidate);

  return randomElement(lowestExposure);
}

function pickMostUncertain(
  context: TastePairSelectionContext,
  anchor: ArtworkEmbedding,
): ArtworkEmbedding | undefined {
  const candidates = context.candidatePool.filter(art => art.id !== anchor.id);
  if (!candidates.length) {
    return undefined;
  }
  const scored = candidates.map(candidate => ({
    candidate,
    score: context.uncertainty[candidate.id] ?? 0,
  }));

  const maxScore = Math.max(...scored.map(entry => entry.score));
  const topCandidates = scored.filter(entry => entry.score === maxScore).map(entry => entry.candidate);

  return randomElement(topCandidates) ?? randomElement(candidates);
}

function violatesDiversityGuards(
  candidate: ArtworkEmbedding,
  context: TastePairSelectionContext,
): boolean {
  if (context.lastArtistId && candidate.artistId === context.lastArtistId) {
    return true;
  }
  if (context.seenStyles.size < context.requiredUniqueStyles) {
    const combinedStyles = new Set([...context.seenStyles, ...candidate.styles]);
    return combinedStyles.size === context.seenStyles.size;
  }
  return false;
}

function pickFallbackPair(pool: ArtworkEmbedding[]): [ArtworkEmbedding, ArtworkEmbedding] | undefined {
  if (pool.length < 2) {
    return undefined;
  }
  return [pool[0], pool[1]];
}

export function selectNextPair(
  context: TastePairSelectionContext,
): TastePairSelectionResult | null {
  if (context.candidatePool.length < 2) {
    return null;
  }

  const anchor = pickHighestUnderexposed(context);
  if (!anchor) {
    return null;
  }

  let challenger = pickMostUncertain(context, anchor);
  if (!challenger) {
    const fallback = pickFallbackPair(context.candidatePool);
    if (!fallback) {
      return null;
    }
    const [a, b] = fallback;
    return {
      artworkAId: a.id,
      artworkBId: b.id,
      rationale: 'fallback_pair',
    };
  }

  if (violatesDiversityGuards(challenger, context)) {
    challenger = context.candidatePool.find(
      candidate => candidate.id !== anchor.id && !violatesDiversityGuards(candidate, context),
    ) ?? challenger;
  }

  return {
    artworkAId: anchor.id,
    artworkBId: challenger.id,
    rationale: 'active_uncertainty',
  };
}

export function rankBySimilarity(
  embeddings: ArtworkEmbedding[],
  pivot: ArtworkEmbedding,
): ArtworkEmbedding[] {
  return [...embeddings].sort((a, b) => {
    const simA = cosineSimilarity(a.clipVector, pivot.clipVector);
    const simB = cosineSimilarity(b.clipVector, pivot.clipVector);
    return simB - simA;
  });
}


