'use client';

import { useEffect } from "react";
import Link from "next/link";
import { SignInButton, useUser } from "@clerk/nextjs";

const BASE_THEME = "theme-modern";

function ThemeBaseline() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const html = document.documentElement;

    const themeClasses = Array.from(html.classList).filter(className =>
      className.startsWith("theme-")
    );
    themeClasses.forEach(className => html.classList.remove(className));
    html.classList.add(BASE_THEME);

    const applyScheme = (isDark: boolean) => {
      if (isDark) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    };

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    applyScheme(mediaQuery.matches);

    const mediaListener = (event: MediaQueryListEvent) => {
      applyScheme(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", mediaListener);
      return () => {
        mediaQuery.removeEventListener("change", mediaListener);
      };
    }

    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(mediaListener);
      return () => {
        mediaQuery.removeListener(mediaListener);
      };
    }

    return () => undefined;
  }, []);

  return null;
}

export default function Home() {
  const { isSignedIn } = useUser();

  return (
    <>
      <ThemeBaseline />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-muted to-bg text-fg px-4 py-16">
        <div className="max-w-3xl text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-fg/60 font-body">Curate. Discover. Echo.</p>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold font-display leading-tight">
            Welcome to
            <span className="relative inline-block ml-3">
              <span aria-hidden="true" className="absolute inset-0 -z-10 blur-2xl opacity-70 bg-gradient-to-r from-accent/60 via-accent2/40 to-accent"></span>
              <span className="relative inline-block px-3 py-1 rounded-xl bg-card/60 shadow-neo transition-transform duration-300 ease-out hover:-translate-y-1 hover:rotate-1">
                <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text ">
                  EchoGallery!
                </span>
              </span>
            </span>
          </h1>
          <p className="mt-6 text-lg text-fg/70 font-body">
            Create an account or sign in to start your art curation journey today!
          </p>
        </div>

        <div className="mt-10">
          {isSignedIn ? (
            <Link href="/taste" className="inline-flex">
              <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 px-6 py-3 text-black font-display text-lg shadow-lg transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card">
                Jump Into Your Taste Test
                <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-black">
                  →
                </span>
              </button>
            </Link>
          ) : (
            <SignInButton mode="modal" redirectUrl="/taste">
              <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 px-6 py-3 text-black font-display text-lg shadow-lg transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card">
                Begin Your Art Curation Journey
                <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-black">
                  →
                </span>
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </>
  );
}
