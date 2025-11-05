export const TASTE_COLOR_OPTIONS = [
  'Blue',
  'Green',
  'Yellow',
  'Orange',
  'Red',
  'Pink',
  'Violet',
  'White',
  'Stone',
  'Black',
] as const;

export type TasteColor = (typeof TASTE_COLOR_OPTIONS)[number];

export const TASTE_COLOR_DIMENSION = TASTE_COLOR_OPTIONS.length;

export const TASTE_MEDIUM_OPTIONS = [
  'Painting',
  'Sculpture',
  'Street Art',
  'Wood Carving',
  'Photography',
] as const;

export type TasteMedium = (typeof TASTE_MEDIUM_OPTIONS)[number];

export const TASTE_MEDIUM_DIMENSION = TASTE_MEDIUM_OPTIONS.length;

export const TASTE_STYLE_OPTIONS = [
  'Modern',
  'Impressionist',
  'Cubist',
  'Renaissance',
  'Baroque/Dutch',
  'Abstract',
  'Minimalist',
  'Pop',
  'Asian ink',
  'African/Indigenous patterns',
] as const;

export type TasteStyle = (typeof TASTE_STYLE_OPTIONS)[number];

export const TASTE_STYLE_DIMENSION = TASTE_STYLE_OPTIONS.length;

export interface TasteColorVector {
  /**
   * Normalized 10-dimensional color vector matching `TASTE_COLOR_OPTIONS` order.
   */
  values: number[];
}

export interface TasteMediumVector {
  /**
   * Normalized 5-dimensional medium vector matching `TASTE_MEDIUM_OPTIONS` order.
   */
  values: number[];
}

export interface TasteStyleVector {
  /**
   * Normalized style vector matching the configured style taxonomy order.
   */
  values: number[];
}

export interface TastePreferenceVectors {
  colors: TasteColorVector;
  mediums: TasteMediumVector;
  styles: TasteStyleVector;
}

export interface TastePairChoice {
  winnerId: string;
  loserId: string;
  round: number;
  skipped?: boolean;
  timestamp?: string;
}

export interface TasteSessionTelemetry {
  skips: number;
  durationSec: number;
  completedAt: string;
}

export interface TasteSessionSummary {
  topStyles: TasteStyle[];
  topMediums: TasteMedium[];
  palette: TasteColor[];
  recommendedArtworkIds: string[];
  facets: {
    styles: TasteStyle[];
    mediums: TasteMedium[];
    colors: TasteColor[];
  };
  stabilityScore: number;
  refineSuggested: boolean;
}

export interface TasteStartRequest {
  userId: string;
  preferenceVectors?: Partial<TastePreferenceVectors>;
}

export interface TasteStartResponse {
  sessionId: string;
  candidateIds: string[];
  expiresAt: string;
}

export interface TasteNextRequest {
  sessionId: string;
  history: TastePairChoice[];
  styles?: TasteStyle[];
}

export interface TastePairArtwork {
  id: string;
  title: string | null;
  artistTitle: string | null;
  imageUrl: string | null;
  originalImageUrl?: string | null;
  styles: TasteStyle[];
  styleTitles?: string[];
}

export interface TasteNextResponse {
  sessionId: string;
  round: number;
  totalRounds: number;
  pair: {
    artworkA: TastePairArtwork;
    artworkB: TastePairArtwork;
    allowSkip: boolean;
  };
}

export interface TasteFinishRequest {
  sessionId: string;
  colors: TasteColor[];
  mediums: TasteMedium[];
  styles: TasteStyle[];
  pairs: TastePairChoice[];
  telemetry: TasteSessionTelemetry;
}

export interface TasteFinishResponse {
  sessionId: string;
  summary: TasteSessionSummary;
  userVector: number[];
  weights: {
    wEmbed: number;
    wAttr: number;
  };
}

export interface ArtworkEmbedding {
  id: string;
  clipVector: number[];
  colorVector: number[];
  mediumVector: number[];
  styleVector: number[];
  mediums: TasteMedium[];
  styles: TasteStyle[];
  colors: TasteColor[];
  artistId: string;
  title?: string | null;
  artistTitle?: string | null;
  imageUrl?: string | null;
  originalImageUrl?: string | null;
  styleTitles?: string[];
  classificationTitles?: string[];
  isPublicDomain?: boolean;
}

export interface TasteScoringWeights {
  alpha: number;
  beta: number;
  gamma: number;
  w1: number;
  w2: number;
}

export interface TastePairSelectionContext {
  round: number;
  totalRounds: number;
  candidatePool: ArtworkEmbedding[];
  exposureCounts: Record<string, number>;
  uncertainty: Record<string, number>;
  lastArtistId?: string;
  requiredUniqueStyles: number;
  seenStyles: Set<TasteStyle>;
  seenArtists: Set<string>;
}

export interface TastePairSelectionResult {
  artworkAId: string;
  artworkBId: string;
  rationale: string;
}

export interface TasteScoringContext {
  userVector: number[];
  priorVectors: TastePreferenceVectors;
  weights: TasteScoringWeights;
}

export interface ArtworkScoreResult {
  artworkId: string;
  score: number;
  priorScore: number;
  similarityScore: number;
}


