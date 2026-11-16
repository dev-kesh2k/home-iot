import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AirVent,
  Bell,
  ChevronRight,
  Cloud,
  CloudRain,
  Droplet,
  House,
  Lightbulb,
  MapPin,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Thermometer,
  Video,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import { roomImage, useData } from '../store';

interface Weather {
  temperature: number;
  humidity: number;
  code: number;
  isDay: boolean;
  description: string;
  city: string;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia,';
  if (h < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

function WeatherIcon({ w }: { w: Weather }) {
  if (w.code >= 51) return <CloudRain className="text-sky-500" size={32} />;
  if (w.code >= 2) return <Cloud className="text-slate-400" size={32} />;
  return w.isDay ? <Sun className="text-amber-400" size={32} /> : <Moon className="text-indigo-400" size={30} />;
}

export default function HomePage() {
  const { data, refresh, toast } = useData();
  const nav = useNavigate();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [todayKwh, setTodayKwh] = useState<{ kwh: number; cost: number } | null>(null);

  useEffect(() => {
    api.get<{ weather: Weather | null }>('/weather').then((r) => setWeather(r.weather)).catch(() => {});
    api.get<{ totalKwh: number; cost: number }>('/energy?period=day').then((r) => setTodayKwh({ kwh: r.totalKwh, cost: r.cost })).catch(() => {});
  }, [data.home.city]);

  const lights = data.devices.filter((d) => d.type === 'light');
  const activeLights = lights.filter((d) => d.on).length;
  const acs = data.devices.filter((d) => d.type === 'ac');
  const acOn = acs.find((d) => d.on);
  const cams = data.devices.filter((d) => d.type === 'camera');

  const toggleSecurity = async () => {
    try {
      await api.post('/home/security', { armed: !data.home.securityArmed });
      toast(data.home.securityArmed ? 'Alarme desarmado' : 'Alarme armado');
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const quick = [
    {
      label: 'Luzes',
      sub: lights.length ? (activeLights ? `${activeLights} acesas` : 'Apagadas') : 'Nenhuma',
      icon: Lightbulb,
      color: activeLights ? 'text-white bg-amber-400' : 'text-amber-400 bg-amber-50',
      onClick: () => nav('/dispositivos?tipo=light'),
    },
    {
      label: 'Ar',
      sub: acOn ? `${acOn.temp}°C` : acs.length ? 'Desligado' : 'Nenhum',
      icon: AirVent,
      color: acOn ? 'text-white bg-brand' : 'text-brand bg-blue-50',
      onClick: () => (acs.length === 1 ? nav(`/dispositivos/${acs[0].id}`) : nav('/dispositivos?tipo=ac')),
    },
    {
      label: 'Segurança',
      sub: data.home.securityArmed ? 'Armada' : 'Desarmada',
      icon: ShieldCheck,
      color: data.home.securityArmed ? 'text-white bg-emerald-500' : 'text-emerald-600 bg-emerald-50',
      onClick: toggleSecurity,
    },
    {
      label: 'Câmera',
      sub: cams.length ? `${cams.filter((c) => c.on).length} online` : 'Nenhuma',
      icon: Video,
      color: 'text-brand bg-blue-50',
      onClick: () => (cams.length === 1 ? nav(`/dispositivos/${cams[0].id}`) : nav('/dispositivos?tipo=camera')),
    },
  ];

  const initials = data.me.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="px-5 pt-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-indigo-400 text-sm font-semibold text-white">
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500">{greeting()}</p>
          <p className="font-semibold text-slate-900">{data.me.name}</p>
        </div>
        <Link to="/atividade" className="relative rounded-full p-2 text-slate-800 hover:bg-white" aria-label="Notificações">
          <Bell size={22} />
          {data.unread > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {data.unread > 9 ? '9+' : data.unread}
            </span>
          )}
        </Link>
      </div>

      <Link
        to="/perfil"
        className="mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#2f80ff] to-[#1d6cf2] p-4 text-white shadow-lg shadow-blue-500/25"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <MapPin size={16} /> {data.home.name}
          </p>
          <p className="mt-1 flex items-center gap-2 truncate text-xs text-white/85">
            <House size={14} /> {data.home.address || data.home.city}
          </p>
        </div>
        <ChevronRight size={20} />
      </Link>

      <div className="card mt-4 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {weather ? <WeatherIcon w={weather} /> : <Sun className="text-slate-300" size={32} />}
          <div>
            <p className="text-2xl font-semibold leading-none">{weather ? `${weather.temperature}°C` : '--'}</p>
            <p className="text-xs text-slate-500">{weather?.description ?? 'Carregando…'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Thermometer className="text-brand" size={22} />
          <div>
            <p className="text-[10px] text-slate-400">Ar ajustado</p>
            <p className="text-sm font-semibold">{acOn ? `${acOn.temp}°C` : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Droplet className="fill-brand text-brand" size={20} />
          <div>
            <p className="text-[10px] text-slate-400">Umidade</p>
            <p className="text-sm font-semibold">{weather ? `${weather.humidity}%` : '--'}</p>
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-6 font-semibold">Controle rápido</h2>
      <div className="grid grid-cols-4 gap-2.5">
        {quick.map((q) => (
          <button key={q.label} onClick={q.onClick} className="card flex flex-col items-center px-1 py-3 active:scale-95">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full transition ${q.color}`}>
              <q.icon size={20} />
            </span>
            <span className="mt-2 text-xs font-medium text-slate-800">{q.label}</span>
            <span className="mt-0.5 text-[10px] leading-tight text-slate-400">{q.sub}</span>
          </button>
        ))}
      </div>

      {data.devices.length === 0 && (
        <Link to="/dispositivos?novo=1" className="card mt-4 flex items-center gap-3 border-2 border-dashed border-blue-200 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-brand">
            <Plus size={20} />
          </span>
          <div>
            <p className="text-sm font-semibold">Adicione seu primeiro dispositivo</p>
            <p className="text-xs text-slate-500">Luzes, ar, tomadas, fechaduras, câmeras…</p>
          </div>
        </Link>
      )}

      <Link to="/energia" className="card mt-4 flex items-center gap-3 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Zap size={20} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">Consumo de energia</p>
          <p className="text-xs text-slate-500">
            {todayKwh
              ? `Hoje: ${todayKwh.kwh.toLocaleString('pt-BR')} kWh · ${todayKwh.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
              : 'Carregando…'}
          </p>
        </div>
        <ChevronRight size={18} className="text-slate-400" />
      </Link>

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="font-semibold">Cômodos</h2>
        <Link to="/comodos" className="text-xs font-medium text-brand">
          Ver todos
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {data.rooms.slice(0, 4).map((r) => {
          const on = data.devices.filter((d) => d.roomId === r.id && d.on).length;
          return (
            <Link key={r.id} to={`/comodos/${r.id}`} className="relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-300 to-slate-500">
              {roomImage(r.image) && <img src={roomImage(r.image)} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-2 left-3 text-white">
                <span className="block text-sm font-medium">{r.name}</span>
                {on > 0 && <span className="block text-[10px] text-white/80">{on} ligado(s)</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
