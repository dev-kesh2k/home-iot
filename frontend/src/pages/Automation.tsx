import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Hand, Leaf, Moon, Play, Plus, ShieldCheck, Thermometer, Zap } from 'lucide-react';
import { api } from '../api';
import { useData, type Automation as A } from '../store';
import { PageHeader, Toggle } from '../ui';

export const AUTO_ICONS: Record<string, { icon: typeof Moon; cls: string }> = {
  moon: { icon: Moon, cls: 'bg-blue-50 text-brand' },
  thermo: { icon: Thermometer, cls: 'bg-blue-50 text-brand' },
  shield: { icon: ShieldCheck, cls: 'bg-emerald-50 text-emerald-600' },
  leaf: { icon: Leaf, cls: 'bg-emerald-50 text-emerald-600' },
  clock: { icon: Clock, cls: 'bg-amber-50 text-amber-500' },
  zap: { icon: Zap, cls: 'bg-amber-50 text-amber-500' },
};

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function describeTrigger(a: A, deviceName: (id: string | null) => string) {
  switch (a.triggerType) {
    case 'time': {
      const days = a.triggerDays.length === 7 ? 'Todos os dias' : a.triggerDays.split('').map((d) => DAYS[Number(d)]).join(', ');
      return `${days} · ${a.triggerTime}`;
    }
    case 'device':
      return `Quando ${deviceName(a.triggerDeviceId)} ${a.triggerState === 'on' ? 'ligar/trancar' : 'desligar/destrancar'}`;
    case 'temperature':
      return `Se a temperatura externa > ${a.triggerTemp}°C`;
    default:
      return 'Execução manual';
  }
}

const CATS = ['Todas', 'Casa', 'Segurança', 'Energia'] as const;

export default function Automation() {
  const { data, refresh, toast } = useData();
  const [cat, setCat] = useState<(typeof CATS)[number]>('Todas');
  const list = data.automations.filter((a) => cat === 'Todas' || a.category === cat);
  const deviceName = (id: string | null) => data.devices.find((d) => d.id === id)?.name ?? 'dispositivo removido';

  const toggle = async (a: A) => {
    try {
      await api.patch(`/automations/${a.id}/toggle`);
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const run = async (a: A) => {
    try {
      const r = await api.post<{ done: number; warnings: string[] }>(`/automations/${a.id}/run`);
      toast(r.warnings.length ? r.warnings[0] : `"${a.title}" executada (${r.done} ação(ões))`, r.warnings.length ? 'error' : 'ok');
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Automação"
        back={false}
        right={
          <Link to="/automacao/nova" className="rounded-full p-1 text-slate-800 hover:bg-white" aria-label="Nova automação">
            <Plus size={22} />
          </Link>
        }
      />
      <div className="px-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? 'chip-on' : 'chip-off'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {list.map((a) => {
            const I = AUTO_ICONS[a.icon] ?? AUTO_ICONS.moon;
            return (
              <div key={a.id} className="card flex items-center gap-3 p-4">
                <Link to={`/automacao/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${I.cls}`}>
                    {a.triggerType === 'manual' ? <Hand size={20} /> : <I.icon size={20} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="truncate text-xs text-slate-400">{describeTrigger(a, deviceName)}</p>
                  </div>
                </Link>
                <button onClick={() => run(a)} className="rounded-full p-2 text-brand hover:bg-blue-50" aria-label="Executar agora">
                  <Play size={16} />
                </button>
                <Toggle on={a.enabled} onChange={() => toggle(a)} />
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              <p>Nenhuma automação.</p>
              <Link to="/automacao/nova" className="mt-3 inline-block font-medium text-brand">
                + Criar automação
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
