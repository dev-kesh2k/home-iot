import { useState } from 'react';
import { ArrowRight, House, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

const HERO = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=70';

export default function Welcome() {
  const { login } = useStore();
  const nav = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      nav('/inicio', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-[#1d6cf2] via-[#2a63c9] to-[#0f2a5c] text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HERO})` }} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1d6cf2] via-[#1d6cf2]/60 to-[#0b1f45]/80" aria-hidden />
      <div className="relative z-10 flex flex-1 flex-col items-center px-8 pt-20 text-center">
        <div className="flex items-center gap-3">
          <House size={44} strokeWidth={1.8} />
          <span className="text-4xl font-semibold tracking-tight">HomeIoT</span>
        </div>
        <p className="mt-6 text-2xl font-medium leading-snug text-white/95">
          Casa mais inteligente,
          <br />
          vida melhor
        </p>
        <p className="mt-5 text-sm text-white/85">
          Controle os dispositivos da sua casa
          <br />
          de qualquer lugar, a qualquer hora.
        </p>
      </div>
      <div className="relative z-10 px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        {showForm ? (
          <form onSubmit={submit} className="rounded-3xl bg-white p-5 text-slate-900 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold">Entrar</h2>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand"
            />
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand"
            />
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <button
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-base font-semibold text-brand shadow-lg active:scale-[0.98]"
          >
            Começar <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
