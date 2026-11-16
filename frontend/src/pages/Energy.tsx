import { useEffect, useState } from 'react';
import { AirVent, Leaf, Lightbulb, Plug, TrendingUp, Tv } from 'lucide-react';
import { api } from '../api';
import { PageHeader } from '../ui';

interface Summary {
  totalKwh: number;
  cost: number;
  tariff: number;
  previousKwh: number;
  changePct: number | null;
  groups: { key: string; label: string; kwh: number; pct: number }[];
  daily: { day: string; kwh: number }[];
  topDevices: { id: string; name: string; type: string; kwh: number }[];
}

const STYLE: Record<string, { icon: typeof AirVent; cls: string; bar: string }> = {
  ac: { icon: AirVent, cls: 'bg-blue-50 text-brand', bar: 'bg-brand' },
  light: { icon: Lightbulb, cls: 'bg-amber-50 text-amber-400', bar: 'bg-amber-400' },
  tv: { icon: Tv, cls: 'bg-blue-50 text-brand', bar: 'bg-sky-400' },
  other: { icon: Plug, cls: 'bg-slate-100 text-slate-700', bar: 'bg-slate-400' },
};

const PERIODS = [
  ['day', 'Dia', 'ontem'],
  ['week', 'Semana', 'semana anterior'],
  ['month', 'Mês', 'mês anterior'],
] as const;

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Energy() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number][0]>('day');
  const [s, setS] = useState<Summary | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.get<Summary>(`/energy?period=${period}`).then((r) => alive && setS(r)).catch(() => {});
    load();
    const t = window.setInterval(load, 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [period]);

  const r = 70;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const maxDay = Math.max(0.01, ...(s?.daily.map((d) => d.kwh) ?? [0]));
  const prevLabel = PERIODS.find((p) => p[0] === period)![2];
  const fill = s && s.previousKwh > 0 ? Math.min(1, s.totalKwh / s.previousKwh) : s && s.totalKwh > 0 ? 1 : 0;

  return (
    <div>
      <PageHeader title="Consumo de energia" />
      <div className="px-5">
        <div className="grid grid-cols-3 gap-2">
          {PERIODS.map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)} className={`chip py-2.5 ${period === k ? 'chip-on' : 'chip-off'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[12rem]">
          <svg viewBox="0 0 180 180" className="h-full w-full rotate-[135deg]">
            <circle cx="90" cy="90" r={r} fill="none" stroke="#dcfce7" strokeWidth="10" strokeDasharray={`${arc} ${circ}`} strokeLinecap="round" />
            <circle cx="90" cy="90" r={r} fill="none" stroke="#16a34a" strokeWidth="10" strokeDasharray={`${arc * fill} ${circ}`} strokeLinecap="round" className="transition-all" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-3xl font-semibold">
              {s ? fmt(s.totalKwh) : '--'} <span className="text-base font-normal">kWh</span>
            </p>
            <p className="text-xs text-slate-500">{s ? brl(s.cost) : ''}</p>
          </div>
        </div>

        {s && s.daily.length > 1 && (
          <div className="card mt-2 p-4">
            <div className="flex h-28 items-end gap-1">
              {s.daily.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center justify-end" title={`${d.day}: ${fmt(d.kwh)} kWh`}>
                  <div className="w-full rounded-t bg-emerald-500/80" style={{ height: `${(d.kwh / maxDay) * 100}%`, minHeight: d.kwh ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>{s.daily[0].day.slice(8, 10)}/{s.daily[0].day.slice(5, 7)}</span>
              <span>hoje</span>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {s?.groups.map((g) => {
            const st = STYLE[g.key];
            return (
              <div key={g.key} className="card flex items-center gap-3 p-3.5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${st.cls}`}>
                  <st.icon size={18} />
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{g.label}</span>
                    <span className="text-slate-500">{fmt(g.kwh)} kWh</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                      <div className={`h-1.5 rounded-full ${st.bar}`} style={{ width: `${g.pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs text-slate-500">{g.pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {s && s.changePct !== null && (
          <div className={`mt-4 flex items-center gap-3 rounded-2xl p-4 ${s.changePct <= 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            {s.changePct <= 0 ? <Leaf className="text-emerald-600" size={28} /> : <TrendingUp className="text-amber-500" size={28} />}
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {s.changePct <= 0 ? `Você está economizando ${Math.abs(s.changePct)}%` : `Consumo ${s.changePct}% maior`}
              </p>
              <p className="text-xs text-slate-500">
                em relação a {prevLabel} ({fmt(s.previousKwh)} kWh)
              </p>
            </div>
          </div>
        )}

        {s && s.topDevices.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 font-semibold">Maiores consumidores</h2>
            <div className="card divide-y divide-slate-100">
              {s.topDevices.map((d) => (
                <div key={d.id} className="flex justify-between px-4 py-3 text-sm">
                  <span>{d.name}</span>
                  <span className="text-slate-500">{fmt(d.kwh)} kWh</span>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Estimativa pela potência cadastrada × tempo ligado · tarifa {s ? brl(s.tariff) : ''}/kWh
        </p>
      </div>
    </div>
  );
}
