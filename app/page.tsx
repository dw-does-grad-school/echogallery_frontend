import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div> 
        <h1 className="text-4xl md:text-6xl font-extrabold text-center">
          Welcome to{' '}
          <span className="relative inline-block ml-2">
            <span aria-hidden="true" className="absolute inset-0 -translate-x-1 -translate-y-1 text-slate-700 opacity-90 z-0">
              EchoGallery!
            </span>
              <span className="relative z-10 inline-block transform-gpu transition-transform duration-200 ease-out hover:scale-105 hover:-translate-y-1 hover:rotate-1">
              <span
                className="bg-gradient-to-r from-amber-400 via-pink-500 to-indigo-600 bg-clip-text text-transparent font-extrabold opacity-95"
                style={{ textShadow: '0 18px 30px rgba(2,6,23,0.65)' }}
              >
                EchoGallery!
              </span>
              </span>
              <span
              aria-hidden="true"
              className="absolute inset-0 -z-10 -translate-x-1 -translate-y-1 blur-2xl opacity-60 bg-gradient-to-r from-amber-300 via-pink-400 to-indigo-400"
              />
          </span>
        </h1>
      </div>
      <div className="mt-10">
        <Link href="#">
          <div className="flex justify-center">
            <button className="relative px-5 py-2.5 overflow-hidden font-bold text-gray-600 bg-gray-100 border border-gray-100 rounded-lg shadow-inner group">
              <span className="absolute top-0 left-0 w-0 h-0 transition-all duration-200 border-t-2 border-gray-600 group-hover:w-full"></span>
              <span className="absolute bottom-0 right-0 w-0 h-0 transition-all duration-200 border-b-2 border-gray-600 group-hover:w-full"></span>
              <span className="absolute top-0 left-0 w-full h-0 transition-all duration-300 delay-200 bg-gray-600 group-hover:h-full"></span>
              <span className="absolute bottom-0 left-0 w-full h-0 transition-all duration-300 delay-200 bg-gray-600 group-hover:h-full"></span>
              <span className="absolute inset-0 w-full h-full duration-300 delay-300 bg-sky-900 opacity-0 group-hover:opacity-100"></span>
              <span className="relative transition-colors duration-300 delay-200 group-hover:text-white">
                Begin Your Art Curation Journey!
              </span>
            </button>
          </div>
        </Link>
      </div>
    </div>
  );
}
