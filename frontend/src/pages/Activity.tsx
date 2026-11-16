import { useEffect, useState } from 'react';
import { Bot, Cpu, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { timeAgo, useData, type Activity } from '../store';
import { PageHeader } from '../ui';

const ICON = {
  alert: { icon: ShieldAlert, cls: 'bg-red-50 text-red-500' },
  security: { icon: ShieldCheck, cls: 'bg-emerald-50 text-emerald-600' },
  automation: { icon: Bot, cls: 'bg-violet-50 text-violet-500' },
  device: { icon: Cpu, cls: 'bg-blue-50 text-brand' },
  info: { icon: Info, cls: 'bg-slate-100 text-slate-500' },
};

export default function ActivityPage() {
  const { data, refresh } = useData();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [seenAt] = useState(data.me.lastSeenAt);

  useEffect(() => {
    const load = () => api.get<{ activity: Activity[] }>('/activity?limit=100').then((r) => setItems(r.activity)).catch(() => {});
    load();
    api.post('/me/seen').then(() => refresh()).catch(() => {});
    const t = window.setInterval(load, 10000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="Atividade" />
      <div className="space-y-2 px-5">
        {items?.map((a) => {
          const I = ICON[a.kind] ?? ICON.info;
          const fresh = new Date(a.createdAt) > new Date(seenAt);
          return (
            <div key={a.id} className={`card flex items-center gap-3 p-3.5 ${fresh ? 'ring-1 ring-brand/30' : ''}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${I.cls}`}>
                <I.icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.title}</p>
                {a.detail && <p className="truncate text-xs text-slate-400">{a.detail}</p>}
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(a.createdAt)}</span>
            </div>
          );
        })}
        {items?.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Nada por aqui ainda.</p>}
      </div>
    </div>
  );
}
