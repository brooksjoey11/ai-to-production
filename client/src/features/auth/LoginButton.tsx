// src/features/auth/LoginButton.tsx
import { trpc } from '../../lib/trpc';

export default function LoginButton() {
  // OAuth flow: redirect to backend's OAuth start endpoint
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/manus`; // adjust as needed
  };

  return (
    <button
      onClick={handleLogin}
      className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors"
    >
      Log in with Manus
    </button>
  );
}
