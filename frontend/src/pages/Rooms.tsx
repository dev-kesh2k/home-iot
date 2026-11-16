import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../api';
import { ROOM_IMAGES, roomImage, useData, type Room } from '../store';
import { Field, PageHeader, Sheet, inputCls } from '../ui';

export function RoomForm({ room, onDone }: { room?: Room; onDone: (deleted?: boolean) => void }) {
  const { refresh, toast } = useData();
  const [name, setName] = useState(room?.name ?? '');
  const [image, setImage] = useState(room?.image ?? 'sala');
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (room) await api.put(`/rooms/${room.id}`, { name, image });
      else await api.post('/rooms', { name, image });
      await refresh();
      onDone();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!room || !confirm(`Excluir o cômodo "${room.name}"? Os dispositivos ficam sem cômodo.`)) return;
    try {
      await api.del(`/rooms/${room.id}`);
      await refresh();
      onDone(true);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <form onSubmit={save}>
      <Field label="Nome">
        <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Imagem">
        <div className="grid grid-cols-4 gap-2">
          {Object.keys(ROOM_IMAGES).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setImage(k)}
              className={`h-14 overflow-hidden rounded-lg ${image === k ? 'ring-2 ring-brand ring-offset-2' : ''}`}
            >
              <img src={ROOM_IMAGES[k]} alt={k} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </Field>
      <Field label="…ou URL de uma imagem">
        <input
          className={inputCls}
          placeholder="https://"
          value={image.startsWith('http') ? image : ''}
          onChange={(e) => setImage(e.target.value || 'sala')}
        />
      </Field>
      <button disabled={busy} className="mt-1 w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">
        Salvar
      </button>
      {room && (
        <button type="button" onClick={remove} className="mt-3 w-full rounded-xl border border-red-200 py-3 font-semibold text-red-500">
          Excluir cômodo
        </button>
      )}
    </form>
  );
}

export default function Rooms() {
  const { data, isAdmin } = useData();
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <PageHeader
        title="Cômodos"
        right={
          isAdmin && (
            <button onClick={() => setAdding(true)} className="rounded-full p-1 text-slate-800 hover:bg-white" aria-label="Novo cômodo">
              <Plus size={22} />
            </button>
          )
        }
      />
      <div className="space-y-3 px-5">
        {data.rooms.map((r) => {
          const devs = data.devices.filter((d) => d.roomId === r.id);
          return (
            <Link key={r.id} to={`/comodos/${r.id}`} className="relative block h-36 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500">
              {roomImage(r.image) && <img src={roomImage(r.image)} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
              <div className="absolute bottom-3 left-4 text-white">
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-white/80">
                  {devs.length} dispositivo(s) · {devs.filter((d) => d.on).length} ligado(s)
                </p>
              </div>
            </Link>
          );
        })}
        {data.rooms.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Nenhum cômodo cadastrado.</p>}
      </div>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Novo cômodo">
        <RoomForm onDone={() => setAdding(false)} />
      </Sheet>
    </div>
  );
}
