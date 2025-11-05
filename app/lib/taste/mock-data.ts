import {
  ArtworkEmbedding,
  TASTE_COLOR_OPTIONS,
  TASTE_COLOR_DIMENSION,
  TASTE_MEDIUM_OPTIONS,
  TASTE_MEDIUM_DIMENSION,
  TASTE_STYLE_OPTIONS,
  TASTE_STYLE_DIMENSION,
} from '@/types/taste';

function oneHotVector(length: number, index: number): number[] {
  return Array.from({ length }, (_, position) => (position === index ? 1 : 0));
}

export function createMockEmbedding(id: string, index = 0): ArtworkEmbedding {
  const colorIndex = index % TASTE_COLOR_DIMENSION;
  const mediumIndex = index % TASTE_MEDIUM_DIMENSION;
  const styleIndex = index % TASTE_STYLE_DIMENSION;

  return {
    id,
    clipVector: Array.from({ length: 4 }, (_, position) => (position === 0 ? index + 1 : 0)),
    colorVector: oneHotVector(TASTE_COLOR_DIMENSION, colorIndex),
    mediumVector: oneHotVector(TASTE_MEDIUM_DIMENSION, mediumIndex),
    styleVector: oneHotVector(TASTE_STYLE_DIMENSION, styleIndex),
    mediums: [TASTE_MEDIUM_OPTIONS[mediumIndex]],
    styles: [TASTE_STYLE_OPTIONS[styleIndex]],
    colors: [TASTE_COLOR_OPTIONS[colorIndex]],
    artistId: `artist_${index % 8}`,
    title: `Mock Artwork ${index + 1}`,
    artistTitle: `Mock Artist ${index % 8}`,
    imageUrl: null,
    originalImageUrl: null,
  };
}

export function buildMockEmbeddings(ids: string[]): ArtworkEmbedding[] {
  return ids.map((id, index) => createMockEmbedding(id, index));
}


