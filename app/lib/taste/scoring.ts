import {
  ArtworkEmbedding,
  ArtworkScoreResult,
  TastePreferenceVectors,
  TasteScoringContext,
  TasteScoringWeights,
} from '@/types/taste';
import { cosineSimilarity } from './math';

export const DEFAULT_WEIGHTS: TasteScoringWeights = {
  alpha: 0.3,
  beta: 0.4,
  gamma: 0.3,
  w1: 0.6,
  w2: 0.4,
};

function vectorToIndexSet(values: number[], threshold = 0): Set<number> {
  return new Set(
    values
      .map((value, index) => (value > threshold ? index : -1))
      .filter(index => index >= 0),
  );
}

function jaccardIndexFromVectors(userVector: number[], artworkVector: number[]): number {
  const userSet = vectorToIndexSet(userVector);
  const artworkSet = vectorToIndexSet(artworkVector);
  if (userSet.size === 0 && artworkSet.size === 0) {
    return 0;
  }
  const intersection = new Set([...userSet].filter(value => artworkSet.has(value)));
  const union = new Set([...userSet, ...artworkSet]);
  return intersection.size / union.size;
}

export function computePriorScore(
  artwork: ArtworkEmbedding,
  preferences: TastePreferenceVectors,
  weights: Pick<TasteScoringWeights, 'alpha' | 'beta' | 'gamma'>,
): number {
  const colorScore = cosineSimilarity(preferences.colors.values, artwork.colorVector);
  const mediumScore = jaccardIndexFromVectors(preferences.mediums.values, artwork.mediumVector);
  const styleScore = jaccardIndexFromVectors(preferences.styles.values, artwork.styleVector);

  return (
    weights.alpha * colorScore +
    weights.beta * mediumScore +
    weights.gamma * styleScore
  );
}

export function computeSimilarityScore(userVector: number[], artwork: ArtworkEmbedding): number {
  return cosineSimilarity(userVector, artwork.clipVector);
}

export function scoreArtwork(
  artwork: ArtworkEmbedding,
  context: TasteScoringContext,
): ArtworkScoreResult {
  const weights = context.weights ?? DEFAULT_WEIGHTS;
  const priorScore = computePriorScore(artwork, context.priorVectors, weights);
  const similarityScore = computeSimilarityScore(context.userVector, artwork);
  const score = weights.w1 * similarityScore + weights.w2 * priorScore;

  return {
    artworkId: artwork.id,
    score,
    priorScore,
    similarityScore,
  };
}

export function scoreArtworks(
  artworks: ArtworkEmbedding[],
  context: TasteScoringContext,
): ArtworkScoreResult[] {
  return artworks.map(artwork => scoreArtwork(artwork, context));
}

export function sortArtworkScores(results: ArtworkScoreResult[]): ArtworkScoreResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}


