import jwt from 'jsonwebtoken';
import { prisma } from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-troque-isto';

export function signToken(user) {
  return jwt.sign({ sub: user.id }, SECRET, { expiresIn: '30d' });
}

export function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, lastSeenAt: u.lastSeenAt };
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    const { sub } = jwt.verify(token, SECRET);
    const user = await prisma.user.findUnique({ where: { id: sub } });
    if (!user) return res.status(401).json({ error: 'Sessão inválida' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas administradores' });
  next();
}
