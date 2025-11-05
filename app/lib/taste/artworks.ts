import {
  ArtworkEmbedding,
  TasteColor,
  TasteMedium,
  TasteStyle,
  TASTE_COLOR_DIMENSION,
  TASTE_MEDIUM_DIMENSION,
  TASTE_MEDIUM_OPTIONS,
  TASTE_STYLE_DIMENSION,
  TASTE_STYLE_OPTIONS,
} from '@/types/taste';
import { l2Normalize } from './math';
import { buildMockEmbeddings } from './mock-data';

const ARTIC_API_ENDPOINT = 'https://api.artic.edu/api/v1/artworks/search';
const ARTIC_FIELDS = 'id,title,artist_title,style_titles,classification_titles,image_id,is_public_domain';

const WIKIART_ROWS_ENDPOINT =
  'https://datasets-server.huggingface.co/rows?dataset=huggan/wikiart&config=default&split=train';
const WIKIART_DEFAULT_TOTAL_ROWS = 11320;
const WIKIART_BATCH_LIMIT = 120;
const WIKIART_BATCHES_PER_FETCH = 3;
const CANDIDATE_CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const STYLE_QUERY_MAP: Partial<Record<TasteStyle, string>> = {
  'Asian ink': 'Asian ink',
  'African/Indigenous patterns': 'African OR Indigenous patterns',
};

const MEDIUM_KEYWORDS: Record<TasteMedium, string[]> = {
  Painting: ['painting', 'paintings'],
  Sculpture: ['sculpture', 'sculptures'],
  'Street Art': ['street'],
  'Wood Carving': ['wood', 'carving'],
  Photography: ['photo', 'photograph', 'photography'],
};

const WIKIART_STYLE_TO_TASTE: Record<string, TasteStyle> = {
  Abstract_Expressionism: 'Abstract',
  Action_painting: 'Abstract',
  Analytical_Cubism: 'Cubist',
  Art_Nouveau: 'Modern',
  Baroque: 'Baroque/Dutch',
  Color_Field_Painting: 'Abstract',
  Contemporary_Realism: 'Modern',
  Cubism: 'Cubist',
  Early_Renaissance: 'Renaissance',
  Expressionism: 'Abstract',
  Fauvism: 'Modern',
  High_Renaissance: 'Renaissance',
  Impressionism: 'Impressionist',
  Mannerism_Late_Renaissance: 'Renaissance',
  Minimalism: 'Minimalist',
  Naive_Art_Primitivism: 'African/Indigenous patterns',
  New_Realism: 'Modern',
  Northern_Renaissance: 'Renaissance',
  Pointillism: 'Impressionist',
  Pop_Art: 'Pop',
  Post_Impressionism: 'Impressionist',
  Realism: 'Modern',
  Rococo: 'Baroque/Dutch',
  Romanticism: 'Modern',
  Symbolism: 'Modern',
  Synthetic_Cubism: 'Cubist',
  Ukiyo_e: 'Asian ink',
};

const WIKIART_GENRE_TO_MEDIUM: Record<string, TasteMedium> = {
  abstract_painting: 'Painting',
  cityscape: 'Painting',
  genre_painting: 'Painting',
  illustration: 'Painting',
  landscape: 'Painting',
  nude_painting: 'Painting',
  portrait: 'Painting',
  religious_painting: 'Painting',
  sketch_and_study: 'Painting',
  still_life: 'Painting',
  'Unknown Genre': 'Painting',
};

function shuffleArray<T>(input: T[]): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normalizeStyleTitle(title: string): string {
  return title.trim().toLowerCase();
}

interface WikiArtFeature {
  feature_idx: number;
  name: string;
  type: {
    _type: string;
    names?: string[];
  };
}

interface WikiArtRow {
  image?: {
    src?: string;
    height?: number;
    width?: number;
  };
  artist?: number;
  genre?: number;
  style?: number;
  title?: string;
}

interface WikiArtRowEntry {
  row_idx: number;
  row: WikiArtRow;
}

interface WikiArtRowsResponse {
  features: WikiArtFeature[];
  rows: WikiArtRowEntry[];
  num_rows_total?: number;
}

interface WikiArtMetadata {
  artistNames: string[];
  genreNames: string[];
  styleNames: string[];
}

let wikiArtMetadata: WikiArtMetadata | null = null;
let wikiArtTotalRows = WIKIART_DEFAULT_TOTAL_ROWS;
const candidateCache = new Map<string, { timestamp: number; embeddings: ArtworkEmbedding[] }>();

function getCandidateCacheKey(styles: TasteStyle[]): string {
  if (!styles.length) {
    return 'all';
  }
  return styles.slice().sort().join('|');
}

async function getRedisCandidates(key: string): Promise<ArtworkEmbedding[] | null> {
  if (!redisUrl || !redisToken) {
    return null;
  }
  try {
    const response = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { result?: string | null };
    if (!data.result) {
      return null;
    }
    const decoded = decodeURIComponent(data.result);
    const parsed = JSON.parse(decoded) as ArtworkEmbedding[];
    return parsed;
  } catch (error) {
    console.error('Redis cache fetch failed:', error);
    return null;
  }
}

async function setRedisCandidates(key: string, embeddings: ArtworkEmbedding[]): Promise<void> {
  if (!redisUrl || !redisToken) {
    return;
  }
  try {
    const payload = encodeURIComponent(JSON.stringify(embeddings));
    const ttlSeconds = Math.floor(CANDIDATE_CACHE_TTL_MS / 1000);
    await fetch(
      `${redisUrl}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${payload}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${redisToken}`,
        },
      },
    );
  } catch (error) {
    console.error('Redis cache write failed:', error);
  }
}

function mapStyleTitlesToTasteStyles(styleTitles: string[] | null | undefined): TasteStyle[] {
  if (!styleTitles || styleTitles.length === 0) {
    return [];
  }
  const normalizedTitles = styleTitles.map(normalizeStyleTitle);
  return TASTE_STYLE_OPTIONS.filter(option => {
    const normalizedOption = normalizeStyleTitle(option);
    return normalizedTitles.some(title => title.includes(normalizedOption) || normalizedOption.includes(title));
  });
}

function buildStyleVector(styles: TasteStyle[]): number[] {
  const vector = Array.from({ length: TASTE_STYLE_DIMENSION }, () => 0);
  styles.forEach(style => {
    const index = TASTE_STYLE_OPTIONS.indexOf(style);
    if (index >= 0) {
      vector[index] = 1;
    }
  });
  return l2Normalize(vector);
}

function mapClassificationToTasteMediums(classifications: string[] | null | undefined): TasteMedium[] {
  if (!classifications) {
    return [];
  }
  const normalized = classifications.map(classification => classification.toLowerCase());
  return TASTE_MEDIUM_OPTIONS.filter(medium => {
    const keywords = MEDIUM_KEYWORDS[medium];
    return keywords.some(keyword => normalized.some(value => value.includes(keyword)));
  });
}

function buildMediumVector(mediums: TasteMedium[]): number[] {
  const vector = Array.from({ length: TASTE_MEDIUM_DIMENSION }, () => 0);
  mediums.forEach(medium => {
    const index = TASTE_MEDIUM_OPTIONS.indexOf(medium);
    if (index >= 0) {
      vector[index] = 1;
    }
  });
  return l2Normalize(vector);
}

function buildColorVector(): number[] {
  return Array.from({ length: TASTE_COLOR_DIMENSION }, () => 0);
}

function buildClipVector(styleVector: number[], mediumVector: number[]): number[] {
  if (styleVector.length === 0 && mediumVector.length === 0) {
    return [0];
  }
  return l2Normalize([...styleVector, ...mediumVector]);
}

function buildProxiedImageUrl(src: string | null, width = 700): string | null {
  if (!src) {
    return null;
  }
  const params = new URLSearchParams({ src, w: String(width) });
  return `/api/image-proxy?${params.toString()}`;
}

function resolveWikiArtStyleLabels(styles: TasteStyle[]): string[] {
  if (!styles.length) {
    return Object.keys(WIKIART_STYLE_TO_TASTE);
  }
  const set = new Set<string>();
  Object.entries(WIKIART_STYLE_TO_TASTE).forEach(([label, tasteStyle]) => {
    if (styles.includes(tasteStyle)) {
      set.add(label);
    }
  });
  return Array.from(set);
}

function mapWikiArtStyleLabelToTaste(styleLabel: string | null | undefined): TasteStyle[] {
  if (!styleLabel) {
    return [];
  }
  const taste = WIKIART_STYLE_TO_TASTE[styleLabel];
  return taste ? [taste] : [];
}

function mapWikiArtGenreToMediums(genreLabel: string | null | undefined): TasteMedium[] {
  if (!genreLabel) {
    return ['Painting'];
  }
  const normalized = genreLabel.toLowerCase();
  const direct = WIKIART_GENRE_TO_MEDIUM[genreLabel] ?? WIKIART_GENRE_TO_MEDIUM[normalized];
  if (direct) {
    return [direct];
  }
  if (normalized.includes('sculpture')) {
    return ['Sculpture'];
  }
  if (normalized.includes('wood')) {
    return ['Wood Carving'];
  }
  if (normalized.includes('photo')) {
    return ['Photography'];
  }
  if (normalized.includes('street')) {
    return ['Street Art'];
  }
  return ['Painting'];
}

function hydrateWikiArtMetadata(response: WikiArtRowsResponse): void {
  if (!wikiArtMetadata) {
    const styleFeature = response.features.find(feature => feature.name === 'style');
    const genreFeature = response.features.find(feature => feature.name === 'genre');
    const artistFeature = response.features.find(feature => feature.name === 'artist');
    wikiArtMetadata = {
      styleNames: styleFeature?.type.names ?? [],
      genreNames: genreFeature?.type.names ?? [],
      artistNames: artistFeature?.type.names ?? [],
    };
  }
  if (typeof response.num_rows_total === 'number' && response.num_rows_total > 0) {
    wikiArtTotalRows = response.num_rows_total;
  }
}

function humanizeSlug(slug: string | undefined): string | null {
  if (!slug) {
    return null;
  }
  const spaced = slug.replace(/[-_]/g, ' ');
  return spaced.replace(/\b\w/g, letter => letter.toUpperCase());
}

function createEmbeddingFromWikiArt(
  entry: WikiArtRowEntry,
  metadata: WikiArtMetadata,
  targetLabels: string[],
  fallbackStyles: TasteStyle[],
): ArtworkEmbedding | null {
  const { row } = entry;
  const originalImageUrl = row.image?.src ?? null;
  if (!originalImageUrl) {
    return null;
  }
  const imageUrl = buildProxiedImageUrl(originalImageUrl);
  if (!imageUrl) {
    return null;
  }

  const styleIdx = typeof row.style === 'number' ? row.style : null;
  const styleLabel = styleIdx !== null ? metadata.styleNames[styleIdx] : null;
  if (targetLabels.length > 0 && styleLabel && !targetLabels.includes(styleLabel)) {
    return null;
  }

  const tasteStyles = mapWikiArtStyleLabelToTaste(styleLabel);
  if (tasteStyles.length === 0 && fallbackStyles.length > 0) {
    tasteStyles.push(...fallbackStyles);
  }
  if (tasteStyles.length === 0) {
    tasteStyles.push('Modern');
  }

  const styleVector = buildStyleVector(tasteStyles);

  const genreIdx = typeof row.genre === 'number' ? row.genre : null;
  const genreLabel = genreIdx !== null ? metadata.genreNames[genreIdx] : null;
  const mediums = mapWikiArtGenreToMediums(genreLabel);
  const mediumVector = buildMediumVector(mediums);
  const clipVector = buildClipVector(styleVector, mediumVector);

  const artistIdx = typeof row.artist === 'number' ? row.artist : null;
  const artistSlug = artistIdx !== null ? metadata.artistNames[artistIdx] : undefined;
  const artistTitle = humanizeSlug(artistSlug);

  const titleBase = styleLabel ? styleLabel.replace(/_/g, ' ') : null;
  const title = row.title ?? titleBase ?? 'WikiArt Selection';

  return {
    id: imageUrl,
    title,
    artistTitle,
    clipVector,
    colorVector: buildColorVector(),
    mediumVector,
    styleVector,
    mediums,
    styles: tasteStyles,
    colors: [],
    artistId: artistTitle ?? artistSlug ?? 'wikiart',
    imageUrl,
    originalImageUrl,
    styleTitles: styleLabel ? [styleLabel] : undefined,
    classificationTitles: genreLabel ? [genreLabel] : undefined,
    isPublicDomain: true,
  };
}

async function fetchWikiArtCandidates(styles: TasteStyle[], totalDesired: number): Promise<ArtworkEmbedding[]> {
  const targetLabels = resolveWikiArtStyleLabels(styles);
  const fallbackStyles = styles.length ? styles : [];
  const results = new Map<string, ArtworkEmbedding>();
  const batchesPerFetch = WIKIART_BATCHES_PER_FETCH;

  for (let attempt = 0; attempt < batchesPerFetch && results.size < totalDesired; attempt += 1) {
    const remaining = totalDesired - results.size;
    const limit = Math.min(WIKIART_BATCH_LIMIT, Math.max(60, remaining * 4));
    const range = Math.max(1, wikiArtTotalRows - limit);
    const offsets = Array.from({ length: 3 }, () => Math.floor(Math.random() * range));

    const responses = await Promise.allSettled(
      offsets.map(offset =>
        fetch(`${WIKIART_ROWS_ENDPOINT}&offset=${offset}&limit=${limit}`, {
          headers: {
            'User-Agent': 'EchoGallery Taste Onboarding',
            Accept: 'application/json',
          },
          cache: 'no-store',
        }),
      ),
    );

    for (const outcome of responses) {
      if (outcome.status !== 'fulfilled' || !outcome.value.ok) {
        continue;
      }

      const data = (await outcome.value.json()) as WikiArtRowsResponse;
      hydrateWikiArtMetadata(data);
      if (!wikiArtMetadata) {
        continue;
      }

      data.rows.forEach(entry => {
        if (results.size >= totalDesired * 2) {
          return;
        }
        const embedding = createEmbeddingFromWikiArt(entry, wikiArtMetadata as WikiArtMetadata, targetLabels, fallbackStyles);
        if (embedding && !results.has(embedding.id)) {
          results.set(embedding.id, embedding);
        }
      });
    }
  }

  return shuffleArray(Array.from(results.values())).slice(0, totalDesired);
}

interface ArticArtworkResponse {
  id: number;
  title: string | null;
  artist_title: string | null;
  style_titles: string[] | null;
  classification_titles: string[] | null;
  image_id: string | null;
  is_public_domain: boolean;
}

function buildImageUrl(imageId: string | null): string | null {
  if (!imageId) {
    return null;
  }
  return `https://www.artic.edu/iiif/2/${imageId}/full/843,/0/default.jpg`;
}

function createEmbeddingFromRecord(record: ArticArtworkResponse): ArtworkEmbedding | null {
  if (!record.image_id || !record.is_public_domain) {
    return null;
  }

  const styles = mapStyleTitlesToTasteStyles(record.style_titles);
  const styleVector = buildStyleVector(styles);
  const mediums = mapClassificationToTasteMediums(record.classification_titles);
  const mediumVector = buildMediumVector(mediums);
  const colorVector = buildColorVector();
  const clipVector = buildClipVector(styleVector, mediumVector);
  const artistId = record.artist_title || `artist_${record.id}`;
  const originalImageUrl = buildImageUrl(record.image_id);
  const imageUrl = buildProxiedImageUrl(originalImageUrl);

  return {
    id: String(record.id),
    title: record.title,
    artistTitle: record.artist_title,
    clipVector,
    colorVector,
    mediumVector,
    styleVector,
    mediums,
    styles,
    colors: [],
    artistId,
    imageUrl,
    originalImageUrl,
    styleTitles: record.style_titles ?? undefined,
    classificationTitles: record.classification_titles ?? undefined,
    isPublicDomain: record.is_public_domain,
  };
}

async function queryArtic(style: TasteStyle, limit: number): Promise<ArticArtworkResponse[]> {
  const q = STYLE_QUERY_MAP[style] ?? style;
  const searchParams = new URLSearchParams({
    q,
    fields: ARTIC_FIELDS,
    limit: String(limit),
  });

  const response = await fetch(`${ARTIC_API_ENDPOINT}?${searchParams.toString()}`, {
    headers: {
      'User-Agent': 'EchoGallery Taste Onboarding',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Artic API error: ${response.status}`);
  }

  const data = (await response.json()) as { data?: ArticArtworkResponse[] };
  return data.data ?? [];
}

export async function fetchCandidateEmbeddingsForStyles(
  styles: TasteStyle[],
  totalDesired = 60,
): Promise<ArtworkEmbedding[]> {
  const cacheKey = getCandidateCacheKey(styles);
  const cached = candidateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CANDIDATE_CACHE_TTL_MS) {
    return cached.embeddings.slice(0, totalDesired);
  }

  const redisCached = await getRedisCandidates(cacheKey);
  if (redisCached && redisCached.length) {
    candidateCache.set(cacheKey, { timestamp: Date.now(), embeddings: redisCached });
    return redisCached.slice(0, totalDesired);
  }

  const aggregated = new Map<string, ArtworkEmbedding>();

  const wikiArtCandidates = await fetchWikiArtCandidates(styles, totalDesired);
  wikiArtCandidates.forEach(candidate => {
    aggregated.set(candidate.id, candidate);
  });

  if (aggregated.size >= totalDesired) {
    const result = Array.from(aggregated.values()).slice(0, totalDesired);
    candidateCache.set(cacheKey, { timestamp: Date.now(), embeddings: result });
    void setRedisCandidates(cacheKey, result);
    return result;
  }

  const fallbackStyles: TasteStyle[] = styles.length ? styles : ['Modern', 'Impressionist', 'Abstract'];
  const perStyle = Math.max(5, Math.ceil(totalDesired / fallbackStyles.length));
  const artInstituteResults = await Promise.allSettled(fallbackStyles.map(style => queryArtic(style, perStyle)));

  artInstituteResults.forEach(result => {
    if (result.status !== 'fulfilled') {
      return;
    }
    result.value.forEach(record => {
      const embedding = createEmbeddingFromRecord(record);
      if (!embedding) {
        return;
      }
      if (styles.length && embedding.styles.length === 0) {
        embedding.styles = styles;
        embedding.styleVector = buildStyleVector(embedding.styles);
        embedding.clipVector = buildClipVector(embedding.styleVector, embedding.mediumVector);
      }
      if (!aggregated.has(embedding.id)) {
        aggregated.set(embedding.id, embedding);
      }
    });
  });

  if (aggregated.size === 0) {
    const result = shuffleArray(
      buildMockEmbeddings(Array.from({ length: totalDesired }, (_, index) => `fallback_${index}`)),
    ).slice(0, totalDesired);
    candidateCache.set(cacheKey, { timestamp: Date.now(), embeddings: result });
    void setRedisCandidates(cacheKey, result);
    return result;
  }

  const finalResult = shuffleArray(Array.from(aggregated.values())).slice(0, totalDesired);
  candidateCache.set(cacheKey, { timestamp: Date.now(), embeddings: finalResult });
  void setRedisCandidates(cacheKey, finalResult);
  return finalResult;
}

