import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Link2, Lock, Plus, Search } from 'lucide-react';
import { TYPE_LABEL, deviceStatus, useData, type Device, type DeviceType } from '../store';
import { DeviceIcon, PageHeader, Sheet, Toggle } from '../ui';
import { DeviceForm } from '../DeviceForm';

export function DeviceRow({ d, showRoom = true }: { d: Device; showRoom?: boolean }) {
  const { setDeviceState, roomName } = useData();
  const toggleable = d.type === 'light' || d.type === 'tv' || d.type === 'plug';
  return (
    <Link to={`/dispositivos/${d.id}`} className="card flex items-center gap-3 p-3.5 active:scale-[0.99]">
      <DeviceIcon type={d.type} active={d.on} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-medium text-slate-900">
          {d.name}
          {d.haEntityId && <Link2 size={12} className="shrink-0 text-brand" aria-label="Vinculado ao Home Assistant" />}
        </p>
        <p className="text-xs text-slate-400">{showRoom ? `${roomName(d.roomId)} · ${deviceStatus(d)}` : deviceStatus(d)}</p>
      </div>
      {toggleable ? (
        <Toggle on={d.on} onChange={(v) => setDeviceState(d.id, { on: v })} />
      ) : (
        <span className="flex items-center gap-1 text-xs text-brand">
          {d.type === 'lock' && <Lock size={13} />}
          {d.type === 'camera' && <span className={`h-2 w-2 rounded-full ${d.on ? 'bg-emerald-500' : 'bg-slate-300'}`} />}
          {d.type === 'ac' ? (d.on ? `${d.temp}°C` : 'Off') : d.type === 'lock' ? (d.on ? 'Trancada' : 'Aberta') : d.on ? 'Online' : 'Offline'}
          <ChevronRight size={16} className="text-slate-400" />
        </span>
      )}
    </Link>
  );
}

export default function Devices() {
  const { data } = useData();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const adding = params.get('novo') === '1';
  const room = params.get('comodo') ?? 'all';
  const tipo = params.get('tipo') as DeviceType | null;

  const setParam = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v === null ? p.delete(k) : p.set(k, v));
    setParams(p, { replace: true });
  };

  const list = useMemo(
    () =>
      data.devices.filter(
        (d) =>
          (room === 'all' || d.roomId === room) && (!tipo || d.type === tipo) && d.name.toLowerCase().includes(q.trim().toLowerCase()),
      ),
    [data.devices, room, tipo, q],
  );

  return (
    <div>
      <PageHeader
        title="Dispositivos"
        back={false}
        right={
          <button onClick={() => setParam({ novo: '1' })} className="rounded-full p-1 text-slate-800 hover:bg-white" aria-label="Adicionar">
            <Plus size={22} />
          </button>
        }
      />
      <div className="px-5">
        <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 px-3 py-2.5">
          <Search size={16} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar dispositivo..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          <button onClick={() => setParam({ comodo: null, tipo: null })} className={`chip ${room === 'all' && !tipo ? 'chip-on' : 'chip-off'}`}>
            Todos
          </button>
          {data.rooms.map((r) => (
            <button key={r.id} onClick={() => setParam({ comodo: r.id, tipo: null })} className={`chip ${room === r.id ? 'chip-on' : 'chip-off'}`}>
              {r.name}
            </button>
          ))}
        </div>
        {tipo && (
          <p className="mt-3 text-xs text-slate-500">
            Filtro: {TYPE_LABEL[tipo]}{' '}
            <button className="text-brand" onClick={() => setParam({ tipo: null })}>
              limpar
            </button>
          </p>
        )}
        <div className="mt-4 space-y-3">
          {list.map((d) => (
            <DeviceRow key={d.id} d={d} />
          ))}
          {list.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              <p>Nenhum dispositivo encontrado.</p>
              <button onClick={() => setParam({ novo: '1' })} className="mt-3 font-medium text-brand">
                + Adicionar dispositivo
              </button>
            </div>
          )}
        </div>
      </div>

      <Sheet open={adding} onClose={() => setParam({ novo: null })} title="Novo dispositivo">
        <DeviceForm defaultRoom={room !== 'all' ? room : undefined} onDone={() => setParam({ novo: null })} />
      </Sheet>
    </div>
  );
}
