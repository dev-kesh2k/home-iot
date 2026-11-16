# HomeIoT

Casa inteligente: luzes, ar-condicionado, TV, tomadas, fechaduras e câmeras, cômodos com cenas,
automações (horário, dispositivo, temperatura externa, manual), consumo de energia, moradores e
integração com o Home Assistant.

- `frontend/`: React + Vite + Tailwind.
- `backend/`: Express + Prisma (PostgreSQL). Agendador de automações com lease no banco (seguro com réplicas).
- Login inicial: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `.env` do servidor (a senha nunca vai para o repositório; sem ela o admin inicial não é criado).
