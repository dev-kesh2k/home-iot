import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AirVent,
  ArrowLeft,
  Cctv,
  Home,
  Lightbulb,
  Lock,
  MoreVertical,
  Plug,
  Smartphone,
  Tv,
  User,
  Workflow,
} from 'lucide-react';
import type { DeviceType } from './store';

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onChange(!on);
      }}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-brand' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}

const iconStyle: Record<DeviceType, { icon: typeof Lightbulb; bg: string; fg: string }> = {
  light: { icon: Lightbulb, bg: 'bg-amber-50', fg: 'text-amber-400' },
  ac: { icon: AirVent, bg: 'bg-blue-50', fg: 'text-brand' },
  tv: { icon: Tv, bg: 'bg-blue-50', fg: 'text-brand' },
  plug: { icon: Plug, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  lock: { icon: Lock, bg: 'bg-slate-100', fg: 'text-slate-700' },
  camera: { icon: Cctv, bg: 'bg-slate-100', fg: 'text-slate-700' },
};

export function DeviceIcon({ type, size = 44, active = true }: { type: DeviceType; size?: number; active?: boolean }) {
  const s = iconStyle[type] ?? { icon: Smartphone, bg: 'bg-slate-100', fg: 'text-slate-600' };
  const Icon = s.icon;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full transition ${active ? `${s.bg} ${s.fg}` : 'bg-slate-100 text-slate-400'}`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.45} strokeWidth={2.2} />
    </span>
  );
}

export function PageHeader({
  title,
  back = true,
  right,
  onMore,
}: {
  title: string;
  back?: boolean;
  right?: ReactNode;
  onMore?: () => void;
}) {
  const nav = useNavigate();
  return (
    <header className="flex items-center gap-3 px-5 pb-3 pt-6">
      {back && (
        <button onClick={() => nav(-1)} className="-ml-1 rounded-full p-1 text-slate-800 hover:bg-white" aria-label="Voltar">
          <ArrowLeft size={22} />
        </button>
      )}
      <h1 className={`flex-1 font-semibold text-slate-900 ${back ? 'text-lg' : 'text-2xl'}`}>{title}</h1>
      {right}
      {onMore && (
        <button onClick={onMore} className="rounded-full p-1 text-slate-700 hover:bg-white" aria-label="Mais">
          <MoreVertical size={20} />
        </button>
      )}
    </header>
  );
}

const tabs = [
  { to: '/inicio', label: 'Início', icon: Home },
  { to: '/dispositivos', label: 'Dispositivos', icon: Smartphone },
  { to: '/automacao', label: 'Automação', icon: Workflow },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export function TabLayout() {
  return (
    <>
      <main className="pb-24">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md md:max-w-2xl xl:max-w-3xl border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="grid grid-cols-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${isActive ? 'text-brand' : 'text-slate-400'}`
              }
            >
              <t.icon size={22} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4 bg-slate-900/40" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand focus:bg-white';
