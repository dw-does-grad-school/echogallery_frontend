'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';

import {
  TasteFinishResponse,
  TastePairChoice,
  TastePairArtwork,
  TasteColor,
  TasteStyle,
  TasteStartResponse,
  TasteNextResponse,
  TASTE_COLOR_OPTIONS,
  TASTE_MEDIUM_OPTIONS,
  TASTE_STYLE_OPTIONS,
} from '@/types/taste';

const STEPS = {
  INTRO: 0,
  COLORS: 1,
  MEDIUMS: 2,
  STYLES: 3,
  PAIRS: 4,
  RESULT: 5,
} as const;

type StepValue = (typeof STEPS)[keyof typeof STEPS];

interface TastePairState {
  artworkA: TastePairArtwork;
  artworkB: TastePairArtwork;
  allowSkip: boolean;
}

interface ApiError {
  error: string;
}

const COLOR_SWATCH_STYLES: Record<TasteColor, { background: string; text: string; border: string }> = {
  Blue: { background: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  Green: { background: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' },
  Yellow: { background: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-500' },
  Orange: { background: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
  Red: { background: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
  Pink: { background: 'bg-pink-400', text: 'text-black', border: 'border-pink-500' },
  Violet: { background: 'bg-violet-500', text: 'text-white', border: 'border-violet-600' },
  White: { background: 'bg-white', text: 'text-black', border: 'border-zinc-300' },
  Stone: { background: 'bg-stone-400', text: 'text-black', border: 'border-stone-500' },
  Black: { background: 'bg-black', text: 'text-white', border: 'border-stone-800' },
};

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z8ZAAAAAASUVORK5CYII=';

interface ArtworkOptionCardProps {
  artwork: TastePairArtwork;
  label: string;
  side: 'A' | 'B';
  onSelect: (side: 'A' | 'B') => void;
}

function ArtworkOptionCard({ artwork, label, side, onSelect }: ArtworkOptionCardProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(side)}
      className="flex h-full flex-col rounded-xl border border-border bg-card/70 text-left shadow transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent"
    >
      <div className="relative w-full overflow-hidden rounded-t-xl bg-muted h-80 sm:h-[420px]">
        <div
          className={`absolute inset-0 rounded-t-xl bg-muted/70 transition-opacity duration-500 ${
            loaded ? 'opacity-0' : 'opacity-100 animate-pulse'
          }`}
        />
        {artwork.imageUrl ? (
          <Image
            src={artwork.imageUrl}
            alt={artwork.title ?? 'Artwork preview'}
            fill
            priority={side === 'A'}
            loading={side === 'A' ? 'eager' : 'lazy'}
            className={`object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            sizes="(max-width: 768px) 100vw, 50vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            onLoadingComplete={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-fg/60 font-body">
            Preview unavailable
          </div>
        )}
        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-fg shadow">
          {label}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-5">
        <div>
          <p className="text-lg font-semibold text-fg font-display">{artwork.title ?? 'Untitled'}</p>
          <p className="text-sm text-fg/60 font-body">{artwork.artistTitle ?? 'Unknown artist'}</p>
          {artwork.styles.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {artwork.styles.map(style => (
                <span key={`${artwork.id}-${style}`} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  {style}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-white">
          Choose this one
        </span>
      </div>
    </button>
  );
}

export default function TasteOnboardingPage() {
  const { user, isLoaded } = useUser();

  const [step, setStep] = useState<StepValue>(STEPS.INTRO);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [totalRounds, setTotalRounds] = useState<number>(7);

  const [selectedColors, setSelectedColors] = useState<TasteColor[]>([]);
  const [selectedMediums, setSelectedMediums] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<TasteStyle[]>([]);

  const [pairHistory, setPairHistory] = useState<TastePairChoice[]>([]);
  const [currentPair, setCurrentPair] = useState<TastePairState | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isFetchingPair, setIsFetchingPair] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<TasteFinishResponse | null>(null);

  useEffect(() => {
    setErrorMessage(null);
  }, [step]);

  const progressDots = useMemo(() => {
    return [STEPS.COLORS, STEPS.MEDIUMS, STEPS.STYLES, STEPS.PAIRS].map(value => ({
      value,
      active: step >= value && step !== STEPS.RESULT,
      completed: step > value,
    }));
  }, [step]);

  const roundsRemaining = useMemo(() => {
    return Math.max(totalRounds - pairHistory.length, 0);
  }, [pairHistory.length, totalRounds]);

  const skipCount = useMemo(() => pairHistory.filter(choice => choice.skipped).length, [pairHistory]);

  const canProceedToColors = selectedColors.length >= 1 && selectedColors.length <= 3;
  const canProceedToMediums = selectedMediums.length >= 1 && selectedMediums.length <= 3;
  const canProceedToStyles = selectedStyles.length >= 1 && selectedStyles.length <= 3;

  const handleStartSession = async () => {
    if (!user?.id) {
      setErrorMessage('You need to be signed in to start the taste test.');
      return;
    }

    setIsStarting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/taste/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = (await response.json()) as TasteStartResponse | ApiError;

      if (!response.ok || 'error' in data) {
        throw new Error(('error' in data && data.error) || 'Failed to start session');
      }

      setSessionId(data.sessionId);
      setSessionStartTime(Date.now());
      setStep(STEPS.COLORS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error starting session';
      setErrorMessage(message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleColorToggle = (color: TasteColor) => {
    setSelectedColors(prev => {
      if (prev.includes(color)) {
        return prev.filter(item => item !== color);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, color];
    });
  };

  const handleMediumToggle = (medium: string) => {
    setSelectedMediums(prev => {
      if (prev.includes(medium)) {
        return prev.filter(item => item !== medium);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, medium];
    });
  };

  const handleStyleToggle = (style: TasteStyle) => {
    setSelectedStyles(prev => {
      if (prev.includes(style)) {
        return prev.filter(item => item !== style);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, style];
    });
  };

  const handleAdvanceFromColors = () => {
    if (!canProceedToColors) {
      setErrorMessage('Choose between 1 and 3 colors to continue.');
      return;
    }
    setStep(STEPS.MEDIUMS);
  };

  const handleAdvanceFromMediums = () => {
    if (!canProceedToMediums) {
      setErrorMessage('Pick between 1 and 3 mediums.');
      return;
    }
    setStep(STEPS.STYLES);
  };

  const handleAdvanceFromStyles = () => {
    if (!canProceedToStyles) {
      setErrorMessage('Select between 1 and 3 styles.');
      return;
    }
    setStep(STEPS.PAIRS);
    void fetchNextPair(pairHistory);
  };

  const fetchNextPair = async (history: TastePairChoice[]) => {
    if (!sessionId) {
      return;
    }

    setIsFetchingPair(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/taste/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, history, styles: selectedStyles }),
      });

      const data = (await response.json().catch(() => null)) as
        | TasteNextResponse
        | ApiError
        | null;

      if (response.status === 409) {
        await handleFinish(history);
        return;
      }

      if (!response.ok || !data || 'error' in data) {
        const message = data && 'error' in data ? data.error : 'Failed to get next pair';
        throw new Error(message);
      }

      setTotalRounds(data.totalRounds);
      setCurrentPair(data.pair);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error fetching pair';
      setErrorMessage(message);
    } finally {
      setIsFetchingPair(false);
    }
  };

  const handlePairSelection = async (selection: 'A' | 'B') => {
    if (!currentPair) {
      return;
    }

    const winnerId = selection === 'A' ? currentPair.artworkA.id : currentPair.artworkB.id;
    const loserId = selection === 'A' ? currentPair.artworkB.id : currentPair.artworkA.id;
    const nextHistory: TastePairChoice[] = [
      ...pairHistory,
      {
        winnerId,
        loserId,
        round: pairHistory.length + 1,
      },
    ];

    setPairHistory(nextHistory);

    if (nextHistory.length >= totalRounds) {
      await handleFinish(nextHistory);
    } else {
      await fetchNextPair(nextHistory);
    }
  };

  const handleSkipPair = async () => {
    if (!currentPair || !currentPair.allowSkip) {
      return;
    }

    const nextHistory: TastePairChoice[] = [
      ...pairHistory,
      {
        winnerId: currentPair.artworkA.id,
        loserId: currentPair.artworkB.id,
        round: pairHistory.length + 1,
        skipped: true,
      },
    ];

    setPairHistory(nextHistory);
    await fetchNextPair(nextHistory);
  };

  const handleFinish = async (history: TastePairChoice[]) => {
    if (!sessionId || !sessionStartTime) {
      return;
    }

    setIsFinishing(true);
    setErrorMessage(null);

    const historySkipCount = history.filter(choice => choice.skipped).length;

    try {
      const response = await fetch('/api/taste/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          colors: selectedColors,
          mediums: selectedMediums,
          styles: selectedStyles,
          pairs: history,
          telemetry: {
            skips: historySkipCount,
            durationSec: Math.round((Date.now() - sessionStartTime) / 1000),
            completedAt: new Date().toISOString(),
          },
        }),
      });

      const data = (await response.json()) as TasteFinishResponse | ApiError;

      if (!response.ok || 'error' in data) {
        throw new Error(('error' in data && data.error) || 'Failed to complete taste test');
      }

      const finishData = data as TasteFinishResponse;
      setResult(finishData);
      setStep(STEPS.RESULT);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error completing taste test';
      setErrorMessage(message);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleRestart = () => {
    setSelectedColors([]);
    setSelectedMediums([]);
    setSelectedStyles([]);
    setPairHistory([]);
    setCurrentPair(null);
    setSessionId(null);
    setSessionStartTime(null);
    setResult(null);
    setStep(STEPS.INTRO);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-lg text-fg/70 font-body">Loading taste onboarding...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-fg font-display">Sign in to continue</h1>
          <p className="text-fg/70 font-body">You need an account to personalize your art feed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-bg py-12 px-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-bold text-fg font-display">Curate Your Echo Gallery</h1>
          <p className="text-fg/70 font-body">We’ll learn your taste in about a minute and serve your first collection.</p>
          <div className="flex justify-center gap-2">
            {progressDots.map(dot => (
              <span
                key={dot.value}
                className={`h-2 w-10 rounded-full transition-all ${
                  dot.completed ? 'bg-accent' : dot.active ? 'bg-accent/60' : 'bg-border'
                }`}
              />
            ))}
          </div>
        </header>

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-body">
            {errorMessage}
          </div>
        )}

        {step === STEPS.INTRO && (
          <section className="rounded-2xl bg-card p-10 shadow-xl border border-border">
            <div className="space-y-6 text-center">
              <h2 className="text-2xl font-semibold text-fg font-display">We’ll learn your taste in 60 seconds.</h2>
              <p className="text-fg/70 font-body">
                A quick taste test unlocks styles, mediums, and a personalized feed curated just for you.
              </p>
              <button
                type="button"
                onClick={handleStartSession}
                disabled={isStarting}
                className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 text-black shadow-lg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStarting ? 'Starting...' : 'Let’s begin'}
              </button>
            </div>
          </section>
        )}

        {step === STEPS.COLORS && (
          <section className="rounded-2xl bg-card p-10 shadow-xl border border-border">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-fg font-display">Pick 1–3 color vibes</h2>
                <p className="text-fg/60 font-body">These swatches shape your palette. We’ll keep it vivid and accessible.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 place-items-center sm:grid-cols-5">
                {TASTE_COLOR_OPTIONS.map(color => {
                  const selected = selectedColors.includes(color);
                  const selectionLimitReached = !selected && selectedColors.length >= 3;
                  const style = COLOR_SWATCH_STYLES[color];
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleColorToggle(color)}
                      disabled={selectionLimitReached}
                      aria-pressed={selected}
                      className={`flex h-20 w-28 sm:w-32 flex-col items-center justify-center rounded-lg border-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
                        selected
                          ? `ring-2 ring-accent ring-offset-2 border-accent scale-[1.03] shadow-lg`
                          : `hover:shadow-md ${selectionLimitReached ? 'opacity-50 cursor-not-allowed' : 'opacity-90 hover:opacity-100'}`
                      } ${style.background} ${style.text} ${selected ? 'ring-offset-card' : style.border}`}
                    >
                      <span>{color}</span>
                      {selected && <span className="mt-1 text-xs font-body uppercase">Selected</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAdvanceFromColors}
                  className="rounded-lg bg-accent px-6 py-3 text-black shadow hover:bg-accent/90"
                >
                  Continue
                </button>
              </div>
            </div>
          </section>
        )}

        {step === STEPS.MEDIUMS && (
          <section className="rounded-2xl bg-card p-10 shadow-xl border border-border">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-fg font-display">Pick up to three mediums</h2>
                <p className="text-fg/60 font-body">We’ll balance familiar works with new discoveries in these mediums.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TASTE_MEDIUM_OPTIONS.map(medium => {
                  const selected = selectedMediums.includes(medium);
                  return (
                    <button
                      key={medium}
                      type="button"
                      onClick={() => handleMediumToggle(medium)}
                      className={`flex items-center justify-between rounded-xl border px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-accent ${
                        selected ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-card text-fg'
                      }`}
                    >
                      <span className="font-medium">{medium}</span>
                      {selected && <span className="text-sm font-body">Selected</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(STEPS.COLORS)}
                  className="rounded-lg border border-border px-6 py-3 text-fg/80 hover:bg-muted/70"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAdvanceFromMediums}
                  className="rounded-lg bg-accent px-6 py-3 text-black shadow hover:bg-accent/90"
                >
                  Continue
                </button>
              </div>
            </div>
          </section>
        )}

        {step === STEPS.STYLES && (
          <section className="rounded-2xl bg-card p-10 shadow-xl border border-border">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-fg font-display">Choose your favorite styles</h2>
                <p className="text-fg/60 font-body">Pick up to three styles. We’ll sample across styles and keep things diverse.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {TASTE_STYLE_OPTIONS.map(style => {
                  const selected = selectedStyles.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => handleStyleToggle(style)}
                      className={`rounded-xl border px-5 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-accent ${
                        selected
                          ? 'border-accent bg-accent/10 text-accent shadow-inner shadow-accent/30'
                          : 'border-border bg-card text-fg'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{style}</span>
                        {selected && <span className="text-xs font-semibold uppercase text-accent">Selected</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(STEPS.MEDIUMS)}
                  className="rounded-lg border border-border px-6 py-3 text-fg/80 hover:bg-muted/70"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleAdvanceFromStyles}
                  className="rounded-lg bg-accent px-6 py-3 text-black shadow hover:bg-accent/90"
                >
                  Continue
                </button>
              </div>
            </div>
          </section>
        )}

        {step === STEPS.PAIRS && (
          <section className="rounded-2xl bg-card p-10 shadow-xl border border-border">
            <div className="flex flex-col gap-8">
              <header className="flex flex-col items-center gap-2 text-center">
                <h2 className="text-xl font-semibold text-fg font-display">Pick the piece you’d hang</h2>
                <p className="text-fg/60 font-body">Round {pairHistory.length + 1} of {totalRounds}. We mix familiar and exploratory works.</p>
              </header>
              {currentPair ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <ArtworkOptionCard
                    artwork={currentPair.artworkA}
                    label="Artwork A"
                    side="A"
                    onSelect={(side) => void handlePairSelection(side)}
                  />
                  <ArtworkOptionCard
                    artwork={currentPair.artworkB}
                    label="Artwork B"
                    side="B"
                    onSelect={(side) => void handlePairSelection(side)}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-10 text-fg/60 font-body">
                  {isFetchingPair ? 'Finding another pair...' : 'No pair loaded yet.'}
                </div>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-fg/60 font-body">
                  <span>Rounds remaining: {roundsRemaining}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>Skips used: {skipCount} / 1</span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleSkipPair}
                    disabled={!currentPair?.allowSkip || skipCount >= 1}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-fg/80 transition hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {skipCount >= 1 ? 'Skip used' : 'See another pair'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFinish(pairHistory)}
                    disabled={isFinishing}
                    className="rounded-lg bg-accent px-5 py-2 text-sm text-white shadow transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isFinishing ? 'Finishing...' : 'Finish early'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {step === STEPS.RESULT && result && (
          <section className="rounded-2xl bg-card p-10 shadow-xl border border-border">
            <div className="space-y-8">
              <header className="space-y-2 text-center">
                <h2 className="text-2xl font-semibold text-fg font-display">Your curated preview is ready</h2>
                <p className="text-fg/60 font-body">Top styles, mediums, and palette we’ll lean into first.</p>
              </header>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-fg/60 font-body">Top Styles</h3>
                  <ul className="mt-3 space-y-2 text-fg font-body">
                    {result.summary.topStyles.map(style => (
                      <li key={style}>{style}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-fg/60 font-body">Mediums</h3>
                  <ul className="mt-3 space-y-2 text-fg font-body">
                    {result.summary.topMediums.map(medium => (
                      <li key={medium}>{medium}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-fg/60 font-body">Palette</h3>
                  <ul className="mt-3 space-y-2 text-fg font-body">
                    {result.summary.palette.map(color => (
                      <li key={color}>{color}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-fg font-display">First 12 picks</h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {result.summary.recommendedArtworkIds.map(id => (
                    <div key={id} className="rounded-lg border border-border bg-card/80 p-4 shadow-sm">
                      <p className="text-sm font-body text-fg/60">Artwork</p>
                      <p className="text-lg font-semibold text-fg font-display">{id}</p>
                    </div>
                  ))}
                </div>
              </div>

              <footer className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-fg/60 font-body">
                  Stability score: {(result.summary.stabilityScore * 100).toFixed(0)}%
                  {result.summary.refineSuggested && ' • Add 3 more pairs to refine further.'}
                </div>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="rounded-lg border border-border px-6 py-3 text-fg/80 transition hover:bg-muted/70"
                >
                  Run again
                </button>
              </footer>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


