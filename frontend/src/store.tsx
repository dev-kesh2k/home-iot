import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api';

export type DeviceType = 'light' | 'ac' | 'tv' | 'plug' | 'lock' | 'camera';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  lastSeenAt: string;
}

export interface Home {
  name: string;
  address: string;
  city: string;
  securityArmed: boolean;
  tariff: number;
  haUrl: string | null;
  haConfigured: boolean;
}

export interface Room {
  id: string;
  name: string;
  image: string;
  sort: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string | null;
  on: boolean;
  brightness: number;
  lightMode: 'warm' | 'cool' | 'rgb';
  temp: number;
  acMode: 'Frio' | 'Ventilar' | 'Seco' | 'Auto';
  fanSpeed: 'Baixa' | 'Média' | 'Alta';
  swing: 'Auto' | 'Fixo';
  powerW: number;
  haEntityId: string | null;
  onSince: string | null;
}

export type ActionOp = 'on' | 'off' | 'toggle' | 'lock' | 'unlock' | 'temp' | 'brightness';
export interface AutomationAction {
  deviceId: string;
  op: ActionOp;
  value?: number;
}

export interface Automation {
  id: string;
  title: string;
  category: 'Casa' | 'Segurança' | 'Energia';
  icon: string;
  enabled: boolean;
  triggerType: 'time' | 'device' | 'temperature' | 'manual';
  triggerTime: string | null;
  triggerDays: string;
  triggerDeviceId: string | null;
  triggerState: 'on' | 'off' | null;
  triggerTemp: number | null;
  actions: AutomationAction[];
  lastRunAt: string | null;
}

export interface Activity {
  id: string;
  title: string;
  detail: string;
  kind: 'info' | 'device' | 'security' | 'alert' | 'automation';
  deviceId: string | null;
  userName: string | null;
  createdAt: string;
}

interface Data {
  me: User;
  home: Home;
  rooms: Room[];
  devices: Device[];
  automations: Automation[];
  unread: number;
}

export const ROOM_IMAGES: Record<string, string> = {
  sala: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=70',
  quarto: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=70',
  cozinha: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=70',
  jardim: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&q=70',
  entrada: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=70',
  banheiro: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=70',
  escritorio: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=70',
  garagem: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=70',
};

export const roomImage = (img: string) => (img?.startsWith('http') ? img : ROOM_IMAGES[img] || '');

interface Ctx {
  data: Data | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  /** Atualiza o estado do dispositivo na hora (otimista) e envia para a API. */
  setDeviceState: (id: string, patch: Partial<Device>) => Promise<void>;
  toast: (msg: string, kind?: 'ok' | 'error') => void;
  roomName: (id: string | null) => string;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(!!getToken());
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: 'ok' | 'error' } | null>(null);
  const toastTimer = useRef<number>();
  const pending = useRef(0);

  const toast = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    setToastMsg({ msg, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 3500);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setData(null);
    setLoading(false);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const d = await api.get<Data>('/bootstrap');
      // Não sobrescreve um estado otimista que ainda está sendo enviado
      if (pending.current === 0) setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh().catch(() => {});
    }, 8000);
    const onVis = () => document.visibilityState === 'visible' && refresh().catch(() => {});
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const r = await api.post<{ token: string }>('/auth/login', { email, password });
    setToken(r.token);
    setLoading(true);
    await refresh();
  };

  const setDeviceState = async (id: string, patch: Partial<Device>) => {
    setData((d) => (d ? { ...d, devices: d.devices.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : d));
    pending.current++;
    try {
      const r = await api.patch<{ device: Device; warning?: string }>(`/devices/${id}/state`, patch);
      if (r.warning) toast(r.warning, 'error');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      pending.current--;
      await refresh().catch(() => {});
    }
  };

  const roomName = (id: string | null) => data?.rooms.find((r) => r.id === id)?.name ?? 'Sem cômodo';

  return (
    <StoreContext.Provider
      value={{ data, loading, isAdmin: data?.me.role === 'admin', login, logout, refresh, setDeviceState, toast, roomName }}
    >
      {children}
      {toastMsg && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div
            className={`max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toastMsg.kind === 'error' ? 'bg-red-500' : 'bg-slate-900'
            }`}
          >
            {toastMsg.msg}
          </div>
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('StoreProvider ausente');
  return ctx;
}

/** Atalho para páginas protegidas (dados sempre carregados). */
export function useData() {
  const s = useStore();
  return { ...s, data: s.data as Data };
}

export function deviceStatus(d: Device): string {
  switch (d.type) {
    case 'ac':
      return d.on ? `${d.temp}°C · ${d.acMode}` : 'Desligado';
    case 'lock':
      return d.on ? 'Trancada' : 'Destrancada';
    case 'camera':
      return d.on ? 'Online' : 'Offline';
    case 'light':
      return d.on ? `Ligada · ${d.brightness}%` : 'Desligada';
    default:
      return d.on ? 'Ligado' : 'Desligado';
  }
}

export const TYPE_LABEL: Record<DeviceType, string> = {
  light: 'Luz',
  ac: 'Ar-condicionado',
  tv: 'TV',
  plug: 'Tomada',
  lock: 'Fechadura',
  camera: 'Câmera',
};

export const DEFAULT_POWER: Record<DeviceType, number> = { light: 9, ac: 1200, tv: 120, plug: 500, lock: 2, camera: 5 };

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}
