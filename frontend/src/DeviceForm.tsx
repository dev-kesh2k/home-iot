import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from './api';
import { DEFAULT_POWER, TYPE_LABEL, useData, type Device, type DeviceType } from './store';
import { Field, inputCls } from './ui';

interface Entity {
  entityId: string;
  name: string;
  state: string;
}

const DOMAIN_TYPE: Record<string, DeviceType> = {
  light: 'light',
  climate: 'ac',
  lock: 'lock',
  camera: 'camera',
  media_player: 'tv',
  switch: 'plug',
  fan: 'plug',
  input_boolean: 'plug',
};

/** Formulário de criação/edição de dispositivo (inclui vínculo com o Home Assistant). */
export function DeviceForm({ device, defaultRoom, onDone }: { device?: Device; defaultRoom?: string; onDone: (d?: Device) => void }) {
  const { data, refresh, toast } = useData();
  const [form, setForm] = useState({
    name: device?.name ?? '',
    type: (device?.type ?? 'light') as DeviceType,
    roomId: device?.roomId ?? defaultRoom ?? data.rooms[0]?.id ?? '',
    powerW: String(device?.powerW ?? DEFAULT_POWER.light),
    haEntityId: device?.haEntityId ?? '',
  });
  const [entities, setEntities] = useState<Entity[] | null>(null);
  const [haError, setHaError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data.home.haConfigured) return;
    api
      .get<{ entities: Entity[] }>('/integration/ha/entities')
      .then((r) => setEntities(r.entities))
      .catch((e) => setHaError((e as Error).message));
  }, [data.home.haConfigured]);

  const pickEntity = (id: string) => {
    const ent = entities?.find((e) => e.entityId === id);
    const type = DOMAIN_TYPE[id.split('.')[0]];
    setForm((f) => ({
      ...f,
      haEntityId: id,
      ...(ent && !f.name ? { name: ent.name } : {}),
      ...(type && !device ? { type, powerW: String(DEFAULT_POWER[type]) } : {}),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, roomId: form.roomId || null, powerW: Number(form.powerW) };
      const r = device
        ? await api.put<{ device: Device }>(`/devices/${device.id}`, body)
        : await api.post<{ device: Device }>('/devices', body);
      await refresh();
      toast(device ? 'Dispositivo atualizado' : 'Dispositivo adicionado');
      onDone(r.device);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {data.home.haConfigured && (
        <Field label="Entidade no Home Assistant">
          {entities ? (
            <select className={inputCls} value={form.haEntityId} onChange={(e) => pickEntity(e.target.value)}>
              <option value="">— Sem vínculo (controle manual) —</option>
              {entities.map((en) => (
                <option key={en.entityId} value={en.entityId}>
                  {en.name} ({en.entityId})
                </option>
              ))}
            </select>
          ) : haError ? (
            <p className="text-xs text-red-500">{haError}</p>
          ) : (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Buscando entidades…
            </p>
          )}
        </Field>
      )}
      <Field label="Nome">
        <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select
            className={inputCls}
            value={form.type}
            onChange={(e) => {
              const type = e.target.value as DeviceType;
              setForm({ ...form, type, powerW: String(DEFAULT_POWER[type]) });
            }}
          >
            {Object.entries(TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Potência (W)">
          <input className={inputCls} type="number" min={0} step="any" value={form.powerW} onChange={(e) => setForm({ ...form, powerW: e.target.value })} />
        </Field>
      </div>
      <Field label="Cômodo">
        <select className={inputCls} value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}>
          <option value="">Sem cômodo</option>
          {data.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </Field>
      {!data.home.haConfigured && (
        <p className="mb-3 text-[11px] leading-snug text-slate-400">
          Para controlar o aparelho físico, conecte o Home Assistant em Perfil → Integração. Sem isso, o app registra o estado, o consumo e as
          automações manualmente.
        </p>
      )}
      <button disabled={busy} className="mt-1 w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">
        {busy ? 'Salvando…' : device ? 'Salvar' : 'Adicionar'}
      </button>
    </form>
  );
}
