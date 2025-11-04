import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-muted to-bg text-fg px-4 py-16">
      <div className="max-w-3xl text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-fg/60 font-body">Curate. Discover. Echo.</p>
        <h1 className="mt-4 text-4xl md:text-6xl font-extrabold font-display leading-tight">
          Welcome to
          <span className="relative inline-block ml-3">
            <span aria-hidden="true" className="absolute inset-0 -z-10 blur-2xl opacity-70 bg-gradient-to-r from-accent/60 via-accent2/40 to-accent"></span>
            <span className="relative inline-block px-3 py-1 rounded-xl bg-card/60 border border-border shadow-neo transition-transform duration-300 ease-out hover:-translate-y-1 hover:rotate-1">
              <span className="bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
                EchoGallery!
              </span>
            </span>
          </span>
        </h1>
        <p className="mt-6 text-lg text-fg/70 font-body">
          Choose a theme in your settings and watch the entire gallery transform instantly. Each palette is tuned to showcase your collection with the emotion it deserves.
        </p>
      </div>

      <div className="mt-10">
        <Link href="/profile/settings" className="inline-flex">
          <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-accent2 px-6 py-3 text-white font-display text-lg shadow-lg transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card">
            Begin Your Art Curation Journey
            <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white">
              →
            </span>
          </button>
        </Link>
      </div>
    </div>
  );
}
