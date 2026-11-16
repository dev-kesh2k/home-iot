import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Cpu,
  House,
  Info,
  KeyRound,
  Link2,
  ShieldCheck,
  Trash2,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { api } from '../api';
import { useData, type User } from '../store';
import { Field, PageHeader, Sheet, Toggle, inputCls } from '../ui';

type SheetId = null | 'perfil' | 'senha' | 'casa' | 'usuarios' | 'ha' | 'seg' | 'ajuda' | 'sobre';

export default function Settings() {
  const { data, isAdmin, logout, refresh, toast } = useData();
  const nav = useNavigate();
  const [sheet, setSheet] = useState<SheetId>(null);
  const me = data.me;
  const initials = me.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const items = [
    { label: 'Informações da casa', sub: data.home.address || data.home.city, icon: House, onClick: () => setSheet('casa'), admin: true },
    { label: 'Gerenciar dispositivos', icon: Cpu, onClick: () => nav('/dispositivos') },
    { label: 'Automação', icon: Workflow, onClick: () => nav('/automacao') },
    { label: 'Consumo de energia', icon: Zap, onClick: () => nav('/energia') },
    { label: 'Notificações e atividade', icon: Bell, onClick: () => nav('/atividade') },
    { label: 'Segurança', sub: data.home.securityArmed ? 'Alarme armado' : 'Alarme desarmado', icon: ShieldCheck, onClick: () => setSheet('seg') },
    { label: 'Moradores', icon: Users, onClick: () => setSheet('usuarios'), admin: true },
    {
      label: 'Integração Home Assistant',
      sub: data.home.haConfigured ? 'Conectado' : 'Não configurado',
      icon: Link2,
      onClick: () => setSheet('ha'),
      admin: true,
    },
    { label: 'Alterar senha', icon: KeyRound, onClick: () => setSheet('senha') },
    { label: 'Ajuda e suporte', icon: CircleHelp, onClick: () => setSheet('ajuda') },
    { label: 'Sobre o app', icon: Info, onClick: () => setSheet('sobre') },
  ].filter((i) => !i.admin || isAdmin);

  const armed = async (v: boolean) => {
    try {
      await api.post('/home/security', { armed: v });
      await refresh();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Configurações" back={false} />
      <div className="px-5">
        <button onClick={() => setSheet('perfil')} className="flex w-full items-center gap-4 py-3 text-left">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-indigo-400 text-xl font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{me.name}</p>
            <p className="truncate text-sm text-slate-500">{me.email}</p>
            <p className="text-[11px] font-medium text-brand">{me.role === 'admin' ? 'Administrador' : 'Morador'}</p>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        <div className="card mt-4 divide-y divide-slate-100">
          {items.map((it) => (
            <button key={it.label} onClick={it.onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <it.icon size={20} className="text-slate-700" />
              <div className="flex-1">
                <p className="text-sm font-medium">{it.label}</p>
                {it.sub && <p className="text-xs text-slate-400">{it.sub}</p>}
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            logout();
            nav('/', { replace: true });
          }}
          className="mt-6 w-full rounded-2xl border border-red-300 bg-white py-3.5 font-semibold text-red-500"
        >
          Sair
        </button>
      </div>

      <Sheet open={sheet === 'perfil'} onClose={() => setSheet(null)} title="Editar perfil">
        <ProfileForm onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'senha'} onClose={() => setSheet(null)} title="Alterar senha">
        <PasswordForm onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'casa'} onClose={() => setSheet(null)} title="Informações da casa">
        <HomeForm onDone={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'usuarios'} onClose={() => setSheet(null)} title="Moradores">
        {sheet === 'usuarios' && <UsersPanel />}
      </Sheet>
      <Sheet open={sheet === 'ha'} onClose={() => setSheet(null)} title="Home Assistant">
        {sheet === 'ha' && <HaPanel />}
      </Sheet>
      <Sheet open={sheet === 'seg'} onClose={() => setSheet(null)} title="Segurança">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <div>
            <p className="text-sm font-medium">Alarme {data.home.securityArmed ? 'armado' : 'desarmado'}</p>
            <p className="text-xs text-slate-500">Avisa na atividade se alguma fechadura for destrancada.</p>
          </div>
          <Toggle on={data.home.securityArmed} onChange={armed} />
        </div>
      </Sheet>
      <Sheet open={sheet === 'ajuda'} onClose={() => setSheet(null)} title="Ajuda e suporte">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <b>Dispositivos:</b> cadastre em Dispositivos → “+”. Informe a potência (W) para calcular o consumo de energia.
          </p>
          <p>
            <b>Controle real:</b> o admin conecta o Home Assistant em Perfil → Integração e vincula cada dispositivo a uma entidade. Os comandos
            vão para o aparelho e o estado volta para o app a cada 20 s.
          </p>
          <p>
            <b>Automações:</b> rodam no servidor, mesmo com o app fechado: por horário, quando um dispositivo muda, pela temperatura externa ou
            manualmente.
          </p>
          <p>
            <b>Moradores:</b> o admin cria logins para quem mora na casa; todos veem e controlam a mesma casa.
          </p>
        </div>
      </Sheet>
      <Sheet open={sheet === 'sobre'} onClose={() => setSheet(null)} title="Sobre o app">
        <p className="text-sm text-slate-600">HomeIoT 2.0 — casa mais inteligente, vida melhor. Clima por Open-Meteo.</p>
      </Sheet>
    </div>
  );
}

function ProfileForm({ onDone }: { onDone: () => void }) {
  const { data, refresh, toast } = useData();
  const [name, setName] = useState(data.me.name);
  const [email, setEmail] = useState(data.me.email);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.put('/me', { name, email });
          await refresh();
          toast('Perfil atualizado');
          onDone();
        } catch (err) {
          toast((err as Error).message, 'error');
        }
      }}
    >
      <Field label="Nome">
        <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="E-mail (login)">
        <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <button className="mt-2 w-full rounded-xl bg-brand py-3 font-semibold text-white">Salvar</button>
    </form>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const { toast } = useData();
  const [currentPassword, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.put('/me', { currentPassword, password });
          toast('Senha alterada');
          setCurrent('');
          setPassword('');
          onDone();
        } catch (err) {
          toast((err as Error).message, 'error');
        }
      }}
    >
      <Field label="Senha atual">
        <input className={inputCls} type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field label="Nova senha (mín. 8)">
        <input className={inputCls} type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <button className="mt-2 w-full rounded-xl bg-brand py-3 font-semibold text-white">Alterar senha</button>
    </form>
  );
}

function HomeForm({ onDone }: { onDone: () => void }) {
  const { data, refresh, toast } = useData();
  const [form, setForm] = useState({
    name: data.home.name,
    address: data.home.address,
    city: data.home.city,
    tariff: String(data.home.tariff),
  });
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api.put('/home', { ...form, tariff: Number(form.tariff.replace(',', '.')) });
          await refresh();
          toast('Casa atualizada');
          onDone();
        } catch (err) {
          toast((err as Error).message, 'error');
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Nome da casa">
        <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Endereço">
        <input className={inputCls} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </Field>
      <Field label="Cidade (para o clima e automações por temperatura)">
        <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
      </Field>
      <Field label="Tarifa de energia (R$/kWh)">
        <input className={inputCls} inputMode="decimal" value={form.tariff} onChange={(e) => setForm({ ...form, tariff: e.target.value })} />
      </Field>
      <button disabled={busy} className="mt-2 w-full rounded-xl bg-brand py-3 font-semibold text-white disabled:opacity-60">
        {busy ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  );
}

function UsersPanel() {
  const { data, toast } = useData();
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const load = () => api.get<{ users: User[] }>('/users').then((r) => setUsers(r.users)).catch((e) => toast(e.message, 'error'));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok);
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div>
      <div className="mb-4 divide-y divide-slate-100 rounded-xl bg-slate-50">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.name}</p>
              <p className="truncate text-xs text-slate-500">{u.email}</p>
            </div>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
              value={u.role}
              disabled={u.id === data.me.id}
              onChange={(e) => act(() => api.put(`/users/${u.id}`, { role: e.target.value }), 'Permissão alterada')}
            >
              <option value="member">Morador</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="p-1 text-slate-400"
              title="Redefinir senha"
              onClick={() => {
                const p = prompt(`Nova senha para ${u.name} (mín. 8):`);
                if (p) act(() => api.put(`/users/${u.id}`, { password: p }), 'Senha redefinida');
              }}
            >
              <KeyRound size={16} />
            </button>
            {u.id !== data.me.id && (
              <button
                className="p-1 text-slate-400 hover:text-red-500"
                onClick={() => confirm(`Excluir ${u.name}?`) && act(() => api.del(`/users/${u.id}`), 'Usuário excluído')}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mb-2 text-sm font-semibold">Adicionar morador</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act(async () => {
            await api.post('/users', form);
            setForm({ name: '', email: '', password: '', role: 'member' });
          }, 'Morador adicionado');
        }}
      >
        <Field label="Nome">
          <input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="E-mail">
          <input className={inputCls} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Senha inicial">
            <input className={inputCls} minLength={6} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Permissão">
            <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="member">Morador</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </div>
        <button className="mt-1 w-full rounded-xl bg-brand py-3 font-semibold text-white">Adicionar</button>
      </form>
    </div>
  );
}

function HaPanel() {
  const { refresh, toast } = useData();
  const [url, setUrl] = useState('');
  const [token, setTokenValue] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    api
      .get<{ url: string; hasToken: boolean }>('/integration/ha')
      .then((r) => {
        setUrl(r.url);
        setHasToken(r.hasToken);
      })
      .catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Salvando…');
    try {
      await api.put('/integration/ha', { url, token });
      setTokenValue('');
      if (!url) {
        setHasToken(false);
        setStatus('Integração removida.');
        await refresh();
        return;
      }
      setHasToken(true);
      const r = await api.post<{ version: string; location: string }>('/integration/ha/test');
      setStatus(`✅ Conectado: ${r.location} (Home Assistant ${r.version})`);
      await refresh();
    } catch (err) {
      setStatus(`❌ ${(err as Error).message}`);
      await refresh();
    }
  };

  return (
    <form onSubmit={save}>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">
        Conecte seu Home Assistant para controlar os aparelhos de verdade (Tuya/Smart Life, Sonoff, Zigbee, Google/Alexa, câmeras…). Ele precisa estar
        acessível pela internet (ex.: Nabu Casa ou Cloudflare Tunnel). Gere o token em Perfil → Segurança → “Tokens de acesso de longa duração”.
      </p>
      <Field label="URL do Home Assistant">
        <input className={inputCls} placeholder="https://minhacasa.ui.nabu.casa" value={url} onChange={(e) => setUrl(e.target.value)} />
      </Field>
      <Field label={hasToken ? 'Token (deixe vazio para manter o atual)' : 'Token de acesso'}>
        <input className={inputCls} type="password" value={token} onChange={(e) => setTokenValue(e.target.value)} />
      </Field>
      {status && <p className="mb-3 text-sm">{status}</p>}
      <button className="w-full rounded-xl bg-brand py-3 font-semibold text-white">Salvar e testar</button>
      {hasToken && (
        <button
          type="button"
          onClick={async () => {
            setStatus('Testando…');
            try {
              const r = await api.post<{ version: string; location: string }>('/integration/ha/test');
              setStatus(`✅ Conectado: ${r.location} (Home Assistant ${r.version})`);
            } catch (err) {
              setStatus(`❌ ${(err as Error).message}`);
              toast((err as Error).message, 'error');
            }
          }}
          className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600"
        >
          Testar conexão
        </button>
      )}
    </form>
  );
}
