import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, getHome, logActivity } from './db.js';
import { publicUser, requireAdmin, requireAuth, signToken } from './auth.js';
import { DEFAULT_POWER, HttpError, TYPES, accrue, setDeviceState } from './devices.js';
import { ACTION_OPS, runAutomation } from './automations.js';
import { energySummary } from './energy.js';
import { getWeather, geocode } from './weather.js';
import { haConfigured, haFetch, listEntities } from './ha.js';

export const api = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);

function publicHome(h) {
  const { haToken, ...rest } = h;
  return { ...rest, haConfigured: haConfigured(h) };
}

api.get('/health', (_req, res) => res.json({ ok: true }));

// ---------- Autenticação ----------
const attempts = new Map();
api.post(
  '/auth/login',
  wrap(async (req, res) => {
    const email = str(req.body?.email).toLowerCase();
    const password = String(req.body?.password ?? '');
    const key = `${req.ip}|${email}`;
    const a = attempts.get(key) || { n: 0, until: 0 };
    if (a.until > Date.now()) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      a.n += 1;
      if (a.n >= 5) Object.assign(a, { n: 0, until: Date.now() + 5 * 60000 });
      attempts.set(key, a);
      throw new HttpError(401, 'E-mail ou senha incorretos');
    }
    attempts.delete(key);
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

api.use(requireAuth);

api.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

api.put(
  '/me',
  wrap(async (req, res) => {
    const data = {};
    if (req.body.name !== undefined) data.name = str(req.body.name) || req.user.name;
    if (req.body.email !== undefined) {
      const email = str(req.body.email).toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'E-mail inválido');
      data.email = email;
    }
    if (req.body.password) {
      if (!(await bcrypt.compare(String(req.body.currentPassword ?? ''), req.user.passwordHash))) {
        throw new HttpError(400, 'Senha atual incorreta');
      }
      if (String(req.body.password).length < 8) throw new HttpError(400, 'A nova senha precisa ter ao menos 8 caracteres');
      data.passwordHash = await bcrypt.hash(String(req.body.password), 10);
    }
    try {
      const user = await prisma.user.update({ where: { id: req.user.id }, data });
      res.json({ user: publicUser(user) });
    } catch (e) {
      if (e.code === 'P2002') throw new HttpError(400, 'E-mail já usado por outro usuário');
      throw e;
    }
  }),
);

api.post(
  '/me/seen',
  wrap(async (req, res) => {
    await prisma.user.update({ where: { id: req.user.id }, data: { lastSeenAt: new Date() } });
    res.json({ ok: true });
  }),
);

// ---------- Estado geral (usado pelo app a cada poucos segundos) ----------
api.get(
  '/bootstrap',
  wrap(async (req, res) => {
    const [home, rooms, devices, automations, unread] = await Promise.all([
      getHome(),
      prisma.room.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] }),
      prisma.device.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.automation.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.activity.count({ where: { createdAt: { gt: req.user.lastSeenAt } } }),
    ]);
    res.json({ me: publicUser(req.user), home: publicHome(home), rooms, devices, automations, unread });
  }),
);

api.get(
  '/weather',
  wrap(async (_req, res) => res.json({ weather: await getWeather() })),
);

api.get(
  '/activity',
  wrap(async (req, res) => {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    res.json({ activity: await prisma.activity.findMany({ orderBy: { createdAt: 'desc' }, take: limit }) });
  }),
);

// ---------- Casa ----------
api.put(
  '/home',
  requireAdmin,
  wrap(async (req, res) => {
    const current = await getHome();
    const data = {};
    if (req.body.name !== undefined) data.name = str(req.body.name) || current.name;
    if (req.body.address !== undefined) data.address = str(req.body.address, 200);
    if (req.body.tariff !== undefined) {
      const t = Number(req.body.tariff);
      if (!(t >= 0 && t < 100)) throw new HttpError(400, 'Tarifa inválida');
      data.tariff = t;
    }
    if (req.body.city !== undefined && str(req.body.city) !== current.city) {
      const city = str(req.body.city);
      const g = city ? await geocode(city).catch(() => null) : null;
      if (city && !g) throw new HttpError(400, 'Cidade não encontrada');
      Object.assign(data, { city: g?.label || city, latitude: g?.latitude ?? null, longitude: g?.longitude ?? null });
    }
    res.json({ home: publicHome(await prisma.home.update({ where: { id: 1 }, data })) });
  }),
);

api.post(
  '/home/security',
  wrap(async (req, res) => {
    const armed = !!req.body.armed;
    const home = await prisma.home.update({ where: { id: 1 }, data: { securityArmed: armed } });
    await logActivity({ title: armed ? 'Alarme armado' : 'Alarme desarmado', detail: req.user.name, kind: 'security', userName: req.user.name });
    if (armed) {
      const open = await prisma.device.findMany({ where: { type: 'lock', on: false } });
      for (const d of open) await logActivity({ title: 'Atenção: fechadura destrancada', detail: d.name, kind: 'alert', deviceId: d.id });
    }
    res.json({ home: publicHome(home) });
  }),
);

// ---------- Cômodos ----------
api.post(
  '/rooms',
  requireAdmin,
  wrap(async (req, res) => {
    const name = str(req.body.name, 60);
    if (!name) throw new HttpError(400, 'Informe o nome do cômodo');
    const count = await prisma.room.count();
    res.json({ room: await prisma.room.create({ data: { name, image: str(req.body.image, 500), sort: count } }) });
  }),
);

api.put(
  '/rooms/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const data = {};
    if (req.body.name !== undefined) data.name = str(req.body.name, 60);
    if (req.body.image !== undefined) data.image = str(req.body.image, 500);
    if (data.name === '') throw new HttpError(400, 'Informe o nome do cômodo');
    res.json({ room: await prisma.room.update({ where: { id: req.params.id }, data }) });
  }),
);

api.delete(
  '/rooms/:id',
  requireAdmin,
  wrap(async (req, res) => {
    await prisma.room.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

const SCENES = { Relaxar: 40, Leitura: 100, Filme: 15, Noite: 5 };

api.post(
  '/rooms/:id/scene',
  wrap(async (req, res) => {
    const level = SCENES[req.body.scene];
    if (!level) throw new HttpError(400, 'Cena inválida');
    const lights = await prisma.device.findMany({ where: { roomId: req.params.id, type: 'light' } });
    const warnings = [];
    for (const l of lights) {
      const { warning } = await setDeviceState(
        l.id,
        { on: true, brightness: level, lightMode: req.body.scene === 'Leitura' ? 'cool' : 'warm' },
        { actor: req.user.name, source: 'scene' },
      );
      if (warning) warnings.push(warning);
    }
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    await logActivity({ title: `Cena "${req.body.scene}" ativada`, detail: room?.name ?? '', kind: 'device', userName: req.user.name });
    res.json({ ok: true, count: lights.length, warning: warnings[0] });
  }),
);

/** Liga/desliga em massa (por cômodo ou por tipo). Fechaduras e câmeras ficam de fora. */
api.post(
  '/devices/bulk',
  wrap(async (req, res) => {
    const where = { type: { notIn: ['lock', 'camera'] } };
    if (req.body.roomId) where.roomId = str(req.body.roomId);
    if (req.body.type) where.type = str(req.body.type);
    const list = await prisma.device.findMany({ where });
    const warnings = [];
    for (const d of list) {
      const { warning } = await setDeviceState(d.id, { on: !!req.body.on }, { actor: req.user.name });
      if (warning) warnings.push(warning);
    }
    res.json({ ok: true, count: list.length, warning: warnings[0] });
  }),
);

// ---------- Dispositivos ----------
function deviceMeta(body, partial = false) {
  const data = {};
  if (!partial || body.name !== undefined) {
    data.name = str(body.name, 60);
    if (!data.name) throw new HttpError(400, 'Informe o nome do dispositivo');
  }
  if (!partial || body.type !== undefined) {
    if (!TYPES.includes(body.type)) throw new HttpError(400, 'Tipo inválido');
    data.type = body.type;
  }
  if (body.roomId !== undefined) data.roomId = body.roomId ? str(body.roomId) : null;
  if (body.powerW !== undefined && body.powerW !== '') {
    const p = Number(body.powerW);
    if (!(p >= 0 && p <= 20000)) throw new HttpError(400, 'Potência inválida');
    data.powerW = p;
  }
  if (body.haEntityId !== undefined) data.haEntityId = str(body.haEntityId, 120) || null;
  return data;
}

api.post(
  '/devices',
  wrap(async (req, res) => {
    const data = deviceMeta(req.body);
    if (data.powerW === undefined) data.powerW = DEFAULT_POWER[data.type];
    const device = await prisma.device.create({ data });
    await logActivity({ title: `Dispositivo adicionado: ${device.name}`, kind: 'info', deviceId: device.id, userName: req.user.name });
    res.json({ device });
  }),
);

api.put(
  '/devices/:id',
  wrap(async (req, res) => {
    const current = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!current) throw new HttpError(404, 'Dispositivo não encontrado');
    const data = deviceMeta(req.body, true);
    // Fecha a conta de energia com a potência antiga antes de mudar
    if (data.powerW !== undefined || data.type !== undefined) await accrue(current);
    res.json({ device: await prisma.device.update({ where: { id: req.params.id }, data }) });
  }),
);

api.patch(
  '/devices/:id/state',
  wrap(async (req, res) => {
    res.json(await setDeviceState(req.params.id, req.body || {}, { actor: req.user.name }));
  }),
);

api.delete(
  '/devices/:id',
  wrap(async (req, res) => {
    const d = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!d) throw new HttpError(404, 'Dispositivo não encontrado');
    await accrue(d);
    await prisma.device.delete({ where: { id: d.id } });
    await logActivity({ title: `Dispositivo removido: ${d.name}`, kind: 'info', userName: req.user.name });
    res.json({ ok: true });
  }),
);

api.get(
  '/devices/:id/snapshot',
  wrap(async (req, res) => {
    const d = await prisma.device.findUnique({ where: { id: req.params.id } });
    if (!d?.haEntityId?.startsWith('camera.')) throw new HttpError(404, 'Câmera sem vínculo com o Home Assistant');
    const home = await getHome();
    const r = await haFetch(home, `/api/camera_proxy/${encodeURIComponent(d.haEntityId)}`, { raw: true, timeout: 12000 });
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(await r.arrayBuffer()));
  }),
);

// ---------- Automações ----------
function automationData(body) {
  const title = str(body.title, 80);
  if (!title) throw new HttpError(400, 'Informe o nome da automação');
  const triggerType = body.triggerType;
  if (!['time', 'device', 'temperature', 'manual'].includes(triggerType)) throw new HttpError(400, 'Gatilho inválido');
  const data = {
    title,
    category: ['Casa', 'Segurança', 'Energia'].includes(body.category) ? body.category : 'Casa',
    icon: str(body.icon, 20) || 'moon',
    triggerType,
    triggerTime: null,
    triggerDays: '0123456',
    triggerDeviceId: null,
    triggerState: null,
    triggerTemp: null,
    lastRunKey: null,
  };
  if (triggerType === 'time') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.triggerTime || '')) throw new HttpError(400, 'Horário inválido');
    data.triggerTime = body.triggerTime;
    data.triggerDays = String(body.triggerDays ?? '0123456').replace(/[^0-6]/g, '');
    if (!data.triggerDays) throw new HttpError(400, 'Escolha ao menos um dia');
  }
  if (triggerType === 'device') {
    if (!body.triggerDeviceId) throw new HttpError(400, 'Escolha o dispositivo do gatilho');
    data.triggerDeviceId = str(body.triggerDeviceId);
    data.triggerState = body.triggerState === 'off' ? 'off' : 'on';
  }
  if (triggerType === 'temperature') {
    const t = Number(body.triggerTemp);
    if (!Number.isFinite(t)) throw new HttpError(400, 'Temperatura inválida');
    data.triggerTemp = t;
  }
  const actions = Array.isArray(body.actions) ? body.actions : [];
  data.actions = actions
    .filter((a) => a && a.deviceId && ACTION_OPS.includes(a.op))
    .slice(0, 20)
    .map((a) => ({ deviceId: str(a.deviceId), op: a.op, ...(a.value !== undefined && a.value !== '' ? { value: Number(a.value) } : {}) }));
  if (!data.actions.length) throw new HttpError(400, 'Adicione ao menos uma ação');
  return data;
}

api.post(
  '/automations',
  wrap(async (req, res) => {
    res.json({ automation: await prisma.automation.create({ data: automationData(req.body) }) });
  }),
);

api.put(
  '/automations/:id',
  wrap(async (req, res) => {
    res.json({ automation: await prisma.automation.update({ where: { id: req.params.id }, data: automationData(req.body) }) });
  }),
);

api.patch(
  '/automations/:id/toggle',
  wrap(async (req, res) => {
    const a = await prisma.automation.findUnique({ where: { id: req.params.id } });
    if (!a) throw new HttpError(404, 'Automação não encontrada');
    res.json({ automation: await prisma.automation.update({ where: { id: a.id }, data: { enabled: !a.enabled } }) });
  }),
);

api.post(
  '/automations/:id/run',
  wrap(async (req, res) => {
    const a = await prisma.automation.findUnique({ where: { id: req.params.id } });
    if (!a) throw new HttpError(404, 'Automação não encontrada');
    res.json(await runAutomation(a, `manual · ${req.user.name}`));
  }),
);

api.delete(
  '/automations/:id',
  wrap(async (req, res) => {
    await prisma.automation.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ---------- Energia ----------
api.get(
  '/energy',
  wrap(async (req, res) => {
    const period = ['day', 'week', 'month'].includes(req.query.period) ? req.query.period : 'day';
    res.json(await energySummary(period));
  }),
);

// ---------- Usuários (admin) ----------
api.get(
  '/users',
  requireAdmin,
  wrap(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ users: users.map(publicUser) });
  }),
);

api.post(
  '/users',
  requireAdmin,
  wrap(async (req, res) => {
    const email = str(req.body.email).toLowerCase();
    const name = str(req.body.name);
    const password = String(req.body.password ?? '');
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Informe nome e e-mail válidos');
    if (password.length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres');
    try {
      const user = await prisma.user.create({
        data: { name, email, role: req.body.role === 'admin' ? 'admin' : 'member', passwordHash: await bcrypt.hash(password, 10) },
      });
      res.json({ user: publicUser(user) });
    } catch (e) {
      if (e.code === 'P2002') throw new HttpError(400, 'Já existe um usuário com esse e-mail');
      throw e;
    }
  }),
);

api.put(
  '/users/:id',
  requireAdmin,
  wrap(async (req, res) => {
    const data = {};
    if (req.body.name) data.name = str(req.body.name);
    if (req.body.role) {
      if (req.params.id === req.user.id && req.body.role !== 'admin') throw new HttpError(400, 'Você não pode remover seu próprio acesso de admin');
      data.role = req.body.role === 'admin' ? 'admin' : 'member';
    }
    if (req.body.password) {
      if (String(req.body.password).length < 8) throw new HttpError(400, 'A senha precisa ter ao menos 8 caracteres');
      data.passwordHash = await bcrypt.hash(String(req.body.password), 10);
    }
    res.json({ user: publicUser(await prisma.user.update({ where: { id: req.params.id }, data })) });
  }),
);

api.delete(
  '/users/:id',
  requireAdmin,
  wrap(async (req, res) => {
    if (req.params.id === req.user.id) throw new HttpError(400, 'Você não pode excluir a si mesmo');
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// ---------- Integração Home Assistant (admin) ----------
api.get(
  '/integration/ha',
  requireAdmin,
  wrap(async (_req, res) => {
    const h = await getHome();
    res.json({ url: h.haUrl || '', hasToken: !!h.haToken });
  }),
);

api.put(
  '/integration/ha',
  requireAdmin,
  wrap(async (req, res) => {
    const url = str(req.body.url, 300).replace(/\/+$/, '');
    if (url && !/^https?:\/\//i.test(url)) throw new HttpError(400, 'A URL deve começar com http:// ou https://');
    const data = { haUrl: url || null };
    if (req.body.token !== undefined && req.body.token !== '') data.haToken = String(req.body.token).trim();
    if (!url) data.haToken = null;
    await prisma.home.update({ where: { id: 1 }, data });
    res.json({ ok: true });
  }),
);

api.post(
  '/integration/ha/test',
  requireAdmin,
  wrap(async (_req, res) => {
    const h = await getHome();
    const info = await haFetch(h, '/api/config');
    res.json({ ok: true, version: info.version, location: info.location_name });
  }),
);

api.get(
  '/integration/ha/entities',
  wrap(async (_req, res) => res.json({ entities: await listEntities() })),
);
