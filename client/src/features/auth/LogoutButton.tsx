// src/features/auth/LogoutButton.tsx
import { trpc } from '../../lib/trpc';
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      navigate('/');
    },
  });

  return (
    <button
      onClick={() => logout.mutate()}
      className="px-6 py-3 bg-black text-white font-bold uppercase tracking-widest border-4 border-black hover:bg-white hover:text-black transition-colors"
    >
      Logout
    </button>
  );
}
