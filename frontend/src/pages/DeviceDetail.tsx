import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen,
  Camera,
  ChevronRight,
  Clapperboard,
  Fan,
  Lightbulb,
  Lock,
  LockOpen,
  Maximize2,
  Minus,
  Moon,
  Plus,
  Power,
  RefreshCw,
  ShieldAlert,
  Snowflake,
  Sofa,
  Sun,
  Unlock,
  Wind,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import { deviceStatus, timeAgo, useData, type Activity, type Device } from '../store';
import { DeviceIcon, PageHeader, Sheet, Toggle } from '../ui';
import { DeviceForm } from '../DeviceForm';

export default function DeviceDetail() {
  const { id } = useParams();
  const { data, setDeviceState, refresh, toast, roomName } = useData();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const d = data.devices.find((x) => x.id === id);
  if (!d) return <Navigate to="/dispositivos" replace />;

  const title = d.type === 'ac' ? `${d.name}` : d.name;
  const set = (patch: Partial<Device>) => setDeviceState(d.id, patch);

  const remove = async () => {
    if (!confirm(`Remover "${d.name}"?`)) return;
    try {
      await api.del(`/devices/${d.id}`);
      nav('/dispositivos', { replace: true });
      await refresh();
      toast('Dispositivo removido');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="min-h-dvh pb-10">
      <PageHeader title={title} onMore={() => setMenu(true)} />
      {d.type === 'light' && <LightView d={d} set={set} />}
      {d.type === 'ac' && <AcView d={d} set={set} />}
      {d.type === 'camera' && <CameraView d={d} set={set} />}
      {d.type === 'lock' && <LockView d={d} set={set} />}
      {(d.type === 'tv' || d.type === 'plug') && <SimpleView d={d} set={set} />}

      <div className="mx-5 mt-6 flex items-center gap-3 rounded-2xl bg-white p-4 text-xs text-slate-500 shadow-sm">
        <Zap size={16} className="text-emerald-600" />
        <span className="flex-1">
          {roomName(d.roomId)} · {d.powerW} W{d.haEntityId ? ` · ${d.haEntityId}` : ' · sem Home Assistant'}
        </span>
      </div>
      <DeviceHistory deviceId={d.id} />

      <Sheet open={menu} onClose={() => setMenu(false)} title="Configurar dispositivo">
        <DeviceForm device={d} onDone={() => setMenu(false)} />
        <button onClick={remove} className="mt-3 w-full rounded-xl border border-red-200 py-3 font-semibold text-red-500">
          Remover dispositivo
        </button>
      </Sheet>
    </div>
  );
}

type ViewProps = { d: Device; set: (p: Partial<Device>) => void };

function DeviceHistory({ deviceId }: { deviceId: string }) {
  const [items, setItems] = useState<Activity[]>([]);
  const { data } = useData();
  const dev = data.devices.find((x) => x.id === deviceId);
  useEffect(() => {
    api
      .get<{ activity: Activity[] }>('/activity?limit=200')
      .then((r) => setItems(r.activity.filter((a) => a.deviceId === deviceId).slice(0, 8)))
      .catch(() => {});
  }, [deviceId, dev?.on]);
  if (!items.length) return null;
  return (
    <div className="px-5">
      <h2 className="mb-3 mt-6 font-semibold">Histórico</h2>
      <div className="card divide-y divide-slate-100">
        {items.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-4 py-3">
            {a.kind === 'alert' && <ShieldAlert size={16} className="text-red-500" />}
            <div className="flex-1">
              <p className="text-sm">{a.title}</p>
              {a.detail && <p className="text-xs text-slate-400">{a.detail}</p>}
            </div>
            <span className="text-[11px] text-slate-400">{timeAgo(a.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SCENES = [
  { name: 'Relaxar', icon: Sofa },
  { name: 'Leitura', icon: BookOpen },
  { name: 'Filme', icon: Clapperboard },
  { name: 'Noite', icon: Moon },
];

function LightView({ d, set }: ViewProps) {
  const { roomName, refresh, toast } = useData();
  const [b, setB] = useState(d.brightness);
  const dragging = useRef(false);
  useEffect(() => {
    if (!dragging.current) setB(d.brightness);
  }, [d.brightness]);

  const glow = d.lightMode === 'cool' ? '#7cb8ff' : d.lightMode === 'rgb' ? '#d946ef' : '#fbbf24';
  const modes = [
    { id: 'warm' as const, label: 'Branco quente', color: 'bg-amber-400' },
    { id: 'cool' as const, label: 'Branco frio', color: 'bg-blue-200' },
    { id: 'rgb' as const, label: 'RGB', color: 'bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]' },
  ];
  const commit = () => {
    dragging.current = false;
    if (b !== d.brightness) set({ brightness: b, on: true });
  };
  const scene = async (name: string) => {
    if (!d.roomId) return toast('Coloque a luz em um cômodo para usar cenas', 'error');
    try {
      const r = await api.post<{ count: number; warning?: string }>(`/rooms/${d.roomId}/scene`, { scene: name });
      toast(r.warning ?? `Cena "${name}" aplicada em ${r.count} luz(es)`, r.warning ? 'error' : 'ok');
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="px-5">
      <div className="flex flex-col items-center pt-4">
        <button
          onClick={() => set({ on: !d.on })}
          className="flex h-48 w-48 items-center justify-center rounded-full border-[10px] bg-white transition"
          style={{ borderColor: d.on ? glow : '#e2e8f0', boxShadow: d.on ? `0 0 ${20 + b / 2}px ${glow}66` : 'none' }}
          aria-label="Ligar/desligar"
        >
          <Lightbulb size={72} style={{ color: d.on ? glow : '#cbd5e1', fill: d.on ? glow : 'none' }} />
        </button>
        <p className="mt-5 text-lg font-semibold">{roomName(d.roomId)}</p>
        <p className="text-xs text-slate-500">{d.on ? 'Ligada' : 'Desligada'} · toque na lâmpada</p>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Sun size={18} className="text-slate-600" />
        <input
          type="range"
          min={1}
          max={100}
          value={b}
          onChange={(e) => {
            dragging.current = true;
            setB(Number(e.target.value));
          }}
          onPointerUp={commit}
          onKeyUp={commit}
          onTouchEnd={commit}
          className="flex-1"
        />
        <span className="w-10 text-right text-sm font-medium">{b}%</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => set({ lightMode: m.id, on: true })}
            className={`card flex flex-col items-center gap-2 py-3 text-[11px] ${d.lightMode === m.id ? 'ring-2 ring-brand' : ''}`}
          >
            <span className={`h-7 w-7 rounded-full ${m.color}`} />
            {m.label}
          </button>
        ))}
      </div>

      <h2 className="mb-3 mt-6 font-semibold">Cenas do cômodo</h2>
      <div className="grid grid-cols-2 gap-3">
        {SCENES.map((s) => (
          <button key={s.name} onClick={() => scene(s.name)} className="flex items-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm text-slate-600 shadow-sm active:bg-blue-50 active:text-brand">
            <s.icon size={16} /> {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function cycle<T>(list: T[], v: T): T {
  return list[(list.indexOf(v) + 1) % list.length];
}

function AcView({ d, set }: ViewProps) {
  const t = d.temp;
  const pct = (t - 16) / (30 - 16);
  const r = 80;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const rows = [
    { label: 'Modo', value: d.acMode, icon: Snowflake, next: () => set({ acMode: cycle<Device['acMode']>(['Frio', 'Ventilar', 'Seco', 'Auto'], d.acMode) }) },
    { label: 'Ventilação', value: d.fanSpeed, icon: Fan, next: () => set({ fanSpeed: cycle<Device['fanSpeed']>(['Baixa', 'Média', 'Alta'], d.fanSpeed) }) },
    { label: 'Oscilação', value: d.swing, icon: Wind, next: () => set({ swing: cycle<Device['swing']>(['Auto', 'Fixo'], d.swing) }) },
  ];
  return (
    <div className="px-5">
      <div className="flex flex-col items-center text-brand">
        <Snowflake size={26} />
        <p className="mt-1 text-sm font-medium text-slate-600">{d.on ? (d.acMode === 'Frio' ? 'Resfriando' : d.acMode) : 'Desligado'}</p>
      </div>
      <div className="relative mx-auto mt-2 h-52 w-52">
        <svg viewBox="0 0 200 200" className="h-full w-full rotate-[135deg]">
          <circle cx="100" cy="100" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" />
          <circle
            cx="100"
            cy="100"
            r={r}
            fill="none"
            stroke={d.on ? '#3b82f6' : '#cbd5e1'}
            strokeWidth="10"
            strokeDasharray={`${arc * pct} ${circ}`}
            strokeLinecap="round"
            className="transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-5xl font-bold text-slate-900">
            {t}
            <span className="align-top text-2xl">°C</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Temperatura definida</p>
        </div>
      </div>
      <div className="-mt-6 flex justify-between px-8">
        <button onClick={() => set({ temp: Math.max(16, t - 1) })} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow" aria-label="Diminuir">
          <Minus size={20} />
        </button>
        <button onClick={() => set({ temp: Math.min(30, t + 1) })} className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow" aria-label="Aumentar">
          <Plus size={20} />
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <button key={row.label} onClick={row.next} className="card flex w-full items-center gap-3 p-4 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-brand">
              <row.icon size={20} />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-slate-400">{row.value}</p>
            </div>
            <ChevronRight size={18} className="text-slate-400" />
          </button>
        ))}
      </div>

      <button
        onClick={() => set({ on: !d.on })}
        className={`mt-6 w-full rounded-2xl py-3.5 font-semibold ${d.on ? 'border-2 border-brand text-brand' : 'bg-brand text-white'}`}
      >
        {d.on ? 'Desligar' : 'Ligar'}
      </button>
    </div>
  );
}

function CameraView({ d, set }: ViewProps) {
  const { roomName, toast } = useData();
  const linked = !!d.haEntityId?.startsWith('camera.');
  const [img, setImg] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState(true);
  const [full, setFull] = useState(false);

  const load = async () => {
    try {
      const url = await api.blobUrl(`/devices/${d.id}/snapshot`);
      setImg((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    if (!linked || !d.on) return;
    load();
    if (!live) return;
    const t = window.setInterval(() => document.visibilityState === 'visible' && load(), 3000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, d.on, live, d.id]);

  const savePhoto = () => {
    if (!img) return toast('Sem imagem para salvar', 'error');
    const a = document.createElement('a');
    a.href = img;
    a.download = `${d.name}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`;
    a.click();
  };

  return (
    <div className="px-5">
      <div className="relative h-56 overflow-hidden rounded-2xl bg-slate-800" onClick={() => img && setFull(true)}>
        {img && d.on && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />
        <div className="absolute left-3 top-3 text-white">
          <p className="font-semibold">{roomName(d.roomId)}</p>
          <p className="flex items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 rounded-full ${d.on ? 'bg-emerald-400' : 'bg-slate-400'}`} /> {deviceStatus(d)}
          </p>
        </div>
        {!linked && (
          <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-xs text-white/80">
            Vincule esta câmera a uma entidade <b>camera.*</b> do Home Assistant (menu ⋮) para ver a imagem ao vivo.
          </p>
        )}
        {linked && error && <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-xs text-red-200">{error}</p>}
        {linked && live && d.on && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> AO VIVO
          </span>
        )}
        <Maximize2 size={16} className="absolute bottom-3 left-3 text-white/80" />
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs text-slate-600">
        {[
          { label: 'Salvar foto', icon: Camera, active: false, onClick: savePhoto },
          { label: 'Atualizar', icon: RefreshCw, active: false, onClick: load },
          { label: live ? 'Pausar' : 'Ao vivo', icon: Clapperboard, active: live, onClick: () => setLive(!live) },
          { label: d.on ? 'Desligar' : 'Ligar', icon: Power, active: d.on, onClick: () => set({ on: !d.on }) },
        ].map((b) => (
          <button key={b.label} onClick={b.onClick} className="flex flex-col items-center gap-1.5">
            <span className={`flex h-12 w-12 items-center justify-center rounded-full shadow-sm ${b.active ? 'bg-brand text-white' : 'bg-white text-slate-800'}`}>
              <b.icon size={20} />
            </span>
            {b.label}
          </button>
        ))}
      </div>
      {full && img && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black" onClick={() => setFull(false)}>
          <img src={img} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function LockView({ d, set }: ViewProps) {
  const { roomName } = useData();
  return (
    <div className="flex flex-col items-center px-5 pt-8">
      <button
        onClick={() => set({ on: !d.on })}
        className={`flex h-48 w-48 items-center justify-center rounded-full border-[10px] bg-white transition ${
          d.on ? 'border-brand text-brand shadow-[0_0_40px_rgba(29,108,242,0.25)]' : 'border-amber-300 text-amber-500'
        }`}
      >
        {d.on ? <Lock size={64} /> : <LockOpen size={64} />}
      </button>
      <p className="mt-5 text-lg font-semibold">{d.on ? 'Trancada' : 'Destrancada'}</p>
      <p className="text-xs text-slate-500">{roomName(d.roomId)}</p>
      <button
        onClick={() => {
          if (d.on && !confirm('Destrancar a porta?')) return;
          set({ on: !d.on });
        }}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-semibold text-white"
      >
        {d.on ? <Unlock size={18} /> : <Lock size={18} />} {d.on ? 'Destrancar' : 'Trancar'}
      </button>
    </div>
  );
}

function SimpleView({ d, set }: ViewProps) {
  const { roomName } = useData();
  return (
    <div className="px-5 pt-6">
      <div className="card flex flex-col items-center p-8">
        <DeviceIcon type={d.type} size={96} active={d.on} />
        <p className="mt-4 text-lg font-semibold">{d.name}</p>
        <p className="text-xs text-slate-500">{roomName(d.roomId)}</p>
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm text-slate-600">{d.on ? 'Ligado' : 'Desligado'}</span>
          <Toggle on={d.on} onChange={(v) => set({ on: v })} />
        </div>
      </div>
    </div>
  );
}
