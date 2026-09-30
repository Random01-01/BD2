# Backend — API REST (Node.js + Express + PostgreSQL)

## Como rodar

```bash
cd backend
npm install
cp .env.example .env        # Windows (PowerShell): copy .env.example .env
# edite o .env: DATABASE_URL (Supabase) e JWT_SECRET
npm run dev                 # API em http://localhost:3001/api/saude
npm test                    # testes unitários (não precisam de banco)
```

> **Nunca** faça commit do `.env` (ele já está no `.gitignore`). O repositório é público e a
> `DATABASE_URL` contém a senha do banco.

Pré-requisitos: Node 18.11+ e o banco criado com `database/01_schema.sql`, `02_seed_dev.sql`
e (no Supabase) `04_supabase_seguranca.sql`.

## Endpoints

### Públicos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/saude` | Verifica API + banco |
| GET | `/api/servicos` | Serviços ativos com categoria |
| GET | `/api/disponibilidade?servico=1&data=2026-10-06` | Horários livres (`["09:00","12:30",...]`) |
| POST | `/api/agendamentos` | Cria agendamento. **409** se o horário não estiver livre |
| POST | `/api/agendamentos/:id/cancelar` | Cliente cancela informando o telefone usado |

Corpo do `POST /api/agendamentos`:
```json
{
  "id_servico": 1,
  "data": "2026-10-06",
  "hora_inicio": "14:00",
  "cliente": { "nome": "Nova Cliente", "telefone": "(18) 95555-1234", "email": "opcional@x.com" },
  "observacao": "opcional"
}
```

### Painel administrativo (header `Authorization: Bearer <token>`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | `{ "email", "senha" }` → `{ token, usuario }` |
| GET | `/api/admin/agenda?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` | Agenda do período |
| PATCH | `/api/admin/agendamentos/:id` | `{ "status": "CONFIRMADO\|CONCLUIDO\|CANCELADO", "motivo_cancelamento": "..." }` |

Transições permitidas: `PENDENTE → CONFIRMADO/CANCELADO`, `CONFIRMADO → CONCLUIDO/CANCELADO`.

## Regras implementadas
- Horários calculados a partir de `horario_disponivel`, descontando `bloqueio_agenda` e agendamentos não cancelados; nunca no passado e respeitando a antecedência mínima (hoje).
- Cliente identificado pelo telefone (somente dígitos); o mesmo telefone reaproveita o cadastro.
- Conflitos: a API confere a disponibilidade e o **banco garante** (erro `23P01` → HTTP 409), inclusive com requisições simultâneas.
- `preco_cobrado` grava o preço vigente na criação.
- Login com bcrypt + JWT (8 h) e limite de tentativas.

## Configurações (`.env`)
`STATUS_INICIAL` (`CONFIRMADO`/`PENDENTE`), `PASSO_MINUTOS`, `ANTECEDENCIA_MINUTOS`, `CORS_ORIGIN`, `PORT`.

## Verificação
Além dos testes unitários (`npm test`), a API foi exercitada de ponta a ponta contra um PostgreSQL
real (22 verificações: disponibilidade, criação, conflitos, 5 requisições simultâneas no mesmo
horário, cancelamento, login, agenda e mudança de status).
