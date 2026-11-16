// Idempotente: roda a cada publicação. Cria o admin inicial, a casa e os cômodos padrão.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ROOMS = [
  { name: 'Sala de Estar', image: 'sala' },
  { name: 'Quarto', image: 'quarto' },
  { name: 'Cozinha', image: 'cozinha' },
  { name: 'Jardim', image: 'jardim' },
  { name: 'Entrada', image: 'entrada' },
];

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@homeiot.local').trim().toLowerCase();
  // Sem senha no código (o repositório é público): o deploy do Hub gera uma e guarda só no .env do servidor.
  const password = String(process.env.SEED_ADMIN_PASSWORD || '');
  if (!password) console.warn('SEED_ADMIN_PASSWORD não definido: admin inicial não criado.');
  const name = process.env.SEED_ADMIN_NAME || 'Administrador';

  if (password && (await prisma.user.count()) === 0) {
    await prisma.user.create({
      data: { email, name, role: 'admin', passwordHash: await bcrypt.hash(password, 10) },
    });
    console.log(`Admin criado: ${email}`);
  }

  await prisma.home.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if ((await prisma.room.count()) === 0) {
    await prisma.room.createMany({ data: ROOMS.map((r, i) => ({ ...r, sort: i })) });
    console.log('Cômodos padrão criados');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
