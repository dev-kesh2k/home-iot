import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useData, type ActionOp, type Automation, type AutomationAction, type Device } from '../store';
import { Field, PageHeader, inputCls } from '../ui';
import { AUTO_ICONS } from './Automation';

const DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function opsFor(d?: Device): { op: ActionOp; label: string }[] {
  if (!d) return [];
  if (d.type === 'lock') return [
    { op: 'lock', label: 'Trancar' },
    { op: 'unlock', label: 'Destrancar' },
  ];
  const base: { op: ActionOp; label: string }[] = [
    { op: 'on', label: 'Ligar' },
    { op: 'off', label: 'Desligar' },
    { op: 'toggle', label: 'Inverter' },
  ];
  if (d.type === 'ac') base.push({ op: 'temp', label: 'Ligar em temperatura…' });
  if (d.type === 'light') base.push({ op: 'brightness', label: 'Ligar com brilho…' });
  return base;
}

export default function AutomationEdit() {
  const { id } = useParams();
  const { data, refresh, toast } = useData();
  const nav = useNavigate();
  const existing = data.automations.find((a) => a.id === id);
  const isNew = id === 'nova';

  const [form, setForm] = useState({
    title: existing?.title ?? '',
    category: existing?.category ?? 'Casa',
    icon: existing?.icon ?? 'moon',
    triggerType: existing?.triggerType ?? 'time',
    triggerTime: existing?.triggerTime ?? '22:00',
    triggerDays: existing?.triggerDays ?? '0123456',
    triggerDeviceId: existing?.triggerDeviceId ?? '',
    triggerState: existing?.triggerState ?? 'on',
    triggerTemp: String(existing?.triggerTemp ?? 28),
  });
  const [actions, setActions] = useState<AutomationAction[]>(existing?.actions ?? []);
  const [busy, setBusy] = useState(false);

  if (!isNew && !existing) return <Navigate to="/automacao" replace />;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleDay = (i: number) => {
    const s = String(i);
    set('triggerDays', form.triggerDays.includes(s) ? form.triggerDays.replace(s, '') : [...form.triggerDays, s].sort().join(''));
  };
  const addAction = () => {
    const d = data.devices[0];
    if (!d) return toast('Cadastre um dispositivo antes', 'error');
    setActions([...actions, { deviceId: d.id, op: opsFor(d)[0].op }]);
  };
  const updateAction = (i: number, patch: Partial<AutomationAction>) => setActions(actions.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form, triggerTemp: Number(form.triggerTemp), actions };
      if (isNew) await api.post<{ automation: Automation }>('/automations', body);
      else await api.put(`/automations/${id}`, body);
      await refresh();
      toast('Automação salva');
      nav('/automacao', { replace: true });
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('Excluir esta automação?')) return;
    try {
      await api.del(`/automations/${id}`);
      await refresh();
      nav('/automacao', { replace: true });
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="min-h-dvh pb-10">
      <PageHeader title={isNew ? 'Nova automação' : 'Editar automação'} />
      <form onSubmit={save} className="space-y-4 px-5">
        <div className="card p-4">
          <Field label="Nome">
            <input className={inputCls} required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Apagar tudo à noite" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value as Automation['category'])}>
                <option>Casa</option>
                <option>Segurança</option>
                <option>Energia</option>
              </select>
            </Field>
            <Field label="Ícone">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(AUTO_ICONS).map(([k, v]) => (
                  <button
                    type="button"
                    key={k}
                    onClick={() => set('icon', k)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${v.cls} ${form.icon === k ? 'ring-2 ring-brand' : ''}`}
                  >
                    <v.icon size={15} />
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className="card p-4">
          <p className="mb-3 text-sm font-semibold">Quando</p>
          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {[
              ['time', 'Horário'],
              ['device', 'Dispositivo'],
              ['temperature', 'Clima'],
              ['manual', 'Manual'],
            ].map(([k, l]) => (
              <button
                type="button"
                key={k}
                onClick={() => set('triggerType', k as Automation['triggerType'])}
                className={`chip px-1 ${form.triggerType === k ? 'chip-on' : 'bg-slate-50 text-slate-500'}`}
              >
                {l}
              </button>
            ))}
          </div>

          {form.triggerType === 'time' && (
            <>
              <Field label="Horário">
                <input type="time" required className={inputCls} value={form.triggerTime} onChange={(e) => set('triggerTime', e.target.value)} />
              </Field>
              <div className="flex justify-between">
                {DAYS.map((d, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`h-9 w-9 rounded-full text-xs font-semibold ${form.triggerDays.includes(String(i)) ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </>
          )}
          {form.triggerType === 'device' && (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select required className={inputCls} value={form.triggerDeviceId} onChange={(e) => set('triggerDeviceId', e.target.value)}>
                <option value="">Escolha…</option>
                {data.devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <select className={inputCls} value={form.triggerState} onChange={(e) => set('triggerState', e.target.value as 'on' | 'off')}>
                <option value="on">ligar / trancar</option>
                <option value="off">desligar / destrancar</option>
              </select>
            </div>
          )}
          {form.triggerType === 'temperature' && (
            <Field label={`Temperatura externa acima de (°C) · cidade: ${data.home.city}`}>
              <input type="number" className={inputCls} value={form.triggerTemp} onChange={(e) => set('triggerTemp', e.target.value)} />
            </Field>
          )}
          {form.triggerType === 'manual' && <p className="text-xs text-slate-500">Execute pelo botão ▶ na lista de automações.</p>}
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Então</p>
            <button type="button" onClick={addAction} className="flex items-center gap-1 text-xs font-medium text-brand">
              <Plus size={14} /> Ação
            </button>
          </div>
          <div className="space-y-3">
            {actions.map((a, i) => {
              const dev = data.devices.find((d) => d.id === a.deviceId);
              const ops = opsFor(dev);
              return (
                <div key={i} className="rounded-xl bg-slate-50 p-3">
                  <div className="flex gap-2">
                    <select
                      className={inputCls}
                      value={a.deviceId}
                      onChange={(e) => {
                        const nd = data.devices.find((d) => d.id === e.target.value);
                        updateAction(i, { deviceId: e.target.value, op: opsFor(nd)[0]?.op ?? 'on', value: undefined });
                      }}
                    >
                      {!dev && <option value={a.deviceId}>(removido)</option>}
                      {data.devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setActions(actions.filter((_, j) => j !== i))} className="px-2 text-slate-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <select className={inputCls} value={a.op} onChange={(e) => updateAction(i, { op: e.target.value as ActionOp })}>
                      {ops.map((o) => (
                        <option key={o.op} value={o.op}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {(a.op === 'temp' || a.op === 'brightness') && (
                      <input
                        type="number"
                        className={`${inputCls} w-24`}
                        placeholder={a.op === 'temp' ? '°C' : '%'}
                        value={a.value ?? ''}
                        onChange={(e) => updateAction(i, { value: e.target.value === '' ? undefined : Number(e.target.value) })}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {actions.length === 0 && <p className="text-xs text-slate-400">Adicione o que deve acontecer.</p>}
          </div>
        </div>

        <button disabled={busy} className="w-full rounded-2xl bg-brand py-3.5 font-semibold text-white disabled:opacity-60">
          {busy ? 'Salvando…' : 'Salvar automação'}
        </button>
        {!isNew && (
          <button type="button" onClick={remove} className="w-full rounded-2xl border border-red-200 py-3.5 font-semibold text-red-500">
            Excluir
          </button>
        )}
      </form>
    </div>
  );
}
