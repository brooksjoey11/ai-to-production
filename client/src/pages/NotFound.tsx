// src/pages/NotFound.tsx
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-sans text-9xl font-black">404</h1>
        <p className="font-sans text-xl mt-4">Page not found</p>
        <Link
          to="/"
          className="inline-block mt-8 px-8 py-4 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
