# Banco de dados (PostgreSQL) — ALTERNATIVA, NÃO USADA NO MOMENTO

> O grupo decidiu seguir com **MySQL** (`../mysql/`), como no Relatório Parcial. Estes scripts ficam guardados
> caso o grupo opte por PostgreSQL/Supabase, conforme o Plano de Ação. A API atual fala só com MySQL.

| Arquivo | Conteúdo |
|---|---|
| `01_schema.sql` | Tabelas, restrições (incluindo a prevenção de conflito de horários) e a view `vw_agenda` |
| `02_seed_dev.sql` | Dados de teste (**somente desenvolvimento**). Login: `admin@mariana.com` / `admin123` |
| `03_testes_regras.sql` | 16 verificações das regras de negócio; roda em transação e termina com `ROLLBACK` |
| `04_supabase_seguranca.sql` | **Só no Supabase:** liga RLS e retira acesso público (anon) às tabelas |

```bash
createdb sistema_agendamento
psql -d sistema_agendamento -f database/postgres/01_schema.sql
psql -d sistema_agendamento -f database/postgres/02_seed_dev.sql
psql -v ON_ERROR_STOP=1 -d sistema_agendamento -f database/postgres/03_testes_regras.sql
```

Requer PostgreSQL 13+. A extensão `btree_gist` é criada pelo próprio `01_schema.sql`
(em serviços gerenciados como Neon, Supabase e Render ela já é liberada).

Detalhes e racional: [`docs/MODELAGEM.md`](../../docs/MODELAGEM.md).
