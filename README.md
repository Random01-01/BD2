# Sistema Web para Gestão de Serviços e Agendamentos

Projeto Integrador em Computação II — UNIVESP, Grupo 4. Sistema de agendamento para uma profissional autônoma da área da beleza, acessível por computador e celular.

| Pasta | O quê |
|---|---|
| `frontend/` | Interface em React (Vite): agendamento do cliente + painel da profissional |
| `backend/` | API REST em Node.js + Express |
| `database/mysql/` | Scripts MySQL (banco do Relatório Parcial + melhorias) |
| `docs/` | Modelagem, fluxos e revisão do Relatório Parcial |

## Testar rápido (sem banco): modo demo
Precisa de Node 18.11+ (de preferência 20+). Em dois terminais:

```bash
# terminal 1 — API com dados fictícios em memória
cd backend && npm install && npm run demo

# terminal 2 — site
cd frontend && npm install && npm run dev      # abra http://localhost:5173
```
Área da profissional: `http://localhost:5173/admin` — `admin@mariana.com` / `admin123`.

## Rodar com MySQL de verdade
1. Crie o banco: `database/mysql/README.md` (Workbench **ou** `docker compose up -d`).
2. `cd backend && cp .env.example .env` e preencha `DATABASE_URL` e `JWT_SECRET` (**nunca** faça commit do `.env`: o repositório é público).
3. `npm run dev` no `backend/` e no `frontend/`.

## Testes
```bash
cd backend  && npm test     # regras de horários e API (repositório em memória)
cd frontend && npm test     # fluxo do cliente e do painel, ligado à API
```
