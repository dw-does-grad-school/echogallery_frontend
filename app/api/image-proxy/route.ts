import type { NextRequest } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';

const ALLOWED_HOSTS = new Set([
  'datasets-server.huggingface.co',
  'www.artic.edu',
  'artic.edu',
]);

const DEFAULT_WIDTH = 700;
const MAX_WIDTH = 1200;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

type CacheEntry = {
  buffer: Uint8Array;
  headers: Record<string, string>;
  timestamp: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __imageProxyCache: Map<string, CacheEntry> | undefined;
}

const memoryCache: Map<string, CacheEntry> = globalThis.__imageProxyCache ?? new Map();
if (!globalThis.__imageProxyCache) {
  globalThis.__imageProxyCache = memoryCache;
}

function isHostAllowed(url: URL): boolean {
  return ALLOWED_HOSTS.has(url.hostname);
}

function getCacheKey(src: string, width: number): string {
  return `${src}|${width}`;
}

export async function GET(request: NextRequest): Promise<Response> {
  const src = request.nextUrl.searchParams.get('src');
  if (!src) {
    return new Response('Missing src parameter', { status: 400 });
  }

  let width = Number(request.nextUrl.searchParams.get('w')) || DEFAULT_WIDTH;
  if (Number.isNaN(width) || width <= 0) {
    width = DEFAULT_WIDTH;
  }
  width = Math.min(width, MAX_WIDTH);

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(src);
  } catch (error) {
    return new Response('Invalid src parameter', { status: 400 });
  }

  if (!isHostAllowed(upstreamUrl)) {
    return new Response('Host not allowed', { status: 403 });
  }

  const cacheKey = getCacheKey(upstreamUrl.toString(), width);
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return new Response(cached.buffer, {
      headers: cached.headers,
    });
  }

  let response: Response;
  try {
    response = await fetch(upstreamUrl.toString(), {
      headers: {
        'User-Agent': 'EchoGallery Image Proxy',
        Accept: 'image/*',
      },
      cache: 'no-store',
    });
  } catch (error) {
    return new Response('Failed to fetch upstream image', { status: 502 });
  }

  if (!response.ok) {
    return new Response('Failed to fetch upstream image', { status: 502 });
  }

  const arrayBuffer = await response.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .resize({ width, fit: sharp.fit.inside, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (error) {
    console.error('Image proxy sharp error:', error);
    return new Response('Failed to process image', { status: 500 });
  }

  const responseBody = new Uint8Array(outputBuffer); // ensures compatibility with web Response type

  const headers = {
    'Content-Type': 'image/webp',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
  } satisfies Record<string, string>;

  memoryCache.set(cacheKey, {
    buffer: responseBody,
    headers,
    timestamp: Date.now(),
  });

  return new Response(responseBody, { headers });
}


