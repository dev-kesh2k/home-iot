import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Clapperboard, Moon, Plus, Sofa } from 'lucide-react';
import { api } from '../api';
import { roomImage, useData } from '../store';
import { PageHeader, Sheet } from '../ui';
import { DeviceRow } from './Devices';
import { DeviceForm } from '../DeviceForm';
import { RoomForm } from './Rooms';

const SCENES = [
  { name: 'Relaxar', icon: Sofa, desc: 'Luzes a 40%, tom quente' },
  { name: 'Leitura', icon: BookOpen, desc: 'Luzes a 100%, tom frio' },
  { name: 'Filme', icon: Clapperboard, desc: 'Luzes a 15%' },
  { name: 'Noite', icon: Moon, desc: 'Luzes a 5%' },
];

export default function Room() {
  const { room } = useParams();
  const { data, refresh, toast, isAdmin } = useData();
  const nav = useNavigate();
  const [tab, setTab] = useState<'devices' | 'scenes'>('devices');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const r = data.rooms.find((x) => x.id === room);
  if (!r) return <Navigate to="/comodos" replace />;
  const devices = data.devices.filter((d) => d.roomId === r.id);
  const switchable = devices.filter((d) => d.type !== 'lock' && d.type !== 'camera');
  const allOn = switchable.length > 0 && switchable.every((d) => d.on);

  const bulk = async () => {
    try {
      const res = await api.post<{ warning?: string }>('/devices/bulk', { roomId: r.id, on: !allOn });
      if (res.warning) toast(res.warning, 'error');
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const scene = async (name: string) => {
    try {
      const res = await api.post<{ count: number; warning?: string }>(`/rooms/${r.id}/scene`, { scene: name });
      toast(res.warning ?? (res.count ? `Cena "${name}" aplicada em ${res.count} luz(es)` : 'Nenhuma luz neste cômodo'), res.warning ? 'error' : 'ok');
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div>
      <PageHeader title={r.name} onMore={isAdmin ? () => setEditing(true) : undefined} />
      <div className="relative h-52 bg-gradient-to-br from-slate-300 to-slate-500">
        {roomImage(r.image) && <img src={roomImage(r.image)} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="relative -mt-5 rounded-t-3xl bg-[#f6f9fe] px-5 pt-5">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button onClick={() => setTab('devices')} className={`chip py-2.5 ${tab === 'devices' ? 'chip-on' : 'chip-off'}`}>
            Dispositivos
          </button>
          <button onClick={() => setTab('scenes')} className={`chip py-2.5 ${tab === 'scenes' ? 'chip-on' : 'chip-off'}`}>
            Cenas
          </button>
        </div>

        {tab === 'devices' ? (
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-medium text-brand">
              <button onClick={() => setAdding(true)} className="flex items-center gap-1">
                <Plus size={14} /> Adicionar
              </button>
              {switchable.length > 0 && <button onClick={bulk}>{allOn ? 'Desligar tudo' : 'Ligar tudo'}</button>}
            </div>
            {devices.map((d) => (
              <DeviceRow key={d.id} d={d} showRoom={false} />
            ))}
            {devices.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Nenhum dispositivo neste cômodo.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {SCENES.map((s) => (
              <button
                key={s.name}
                onClick={() => scene(s.name)}
                className="flex flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left text-sm font-medium text-slate-700 shadow-sm active:bg-blue-50 active:text-brand"
              >
                <s.icon size={22} className="text-brand" />
                {s.name}
                <span className="text-[11px] font-normal text-slate-400">{s.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title={`Novo dispositivo · ${r.name}`}>
        <DeviceForm defaultRoom={r.id} onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={editing} onClose={() => setEditing(false)} title="Editar cômodo">
        <RoomForm
          room={r}
          onDone={(deleted) => {
            setEditing(false);
            if (deleted) nav('/comodos', { replace: true });
          }}
        />
      </Sheet>
    </div>
  );
}
