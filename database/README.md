# Banco de dados (PostgreSQL)

| Arquivo | Conteúdo |
|---|---|
| `01_schema.sql` | Tabelas, restrições (incluindo a prevenção de conflito de horários) e a view `vw_agenda` |
| `02_seed_dev.sql` | Dados de teste (**somente desenvolvimento**). Login: `admin@mariana.com` / `admin123` |
| `03_testes_regras.sql` | 16 verificações das regras de negócio; roda em transação e termina com `ROLLBACK` |

```bash
createdb sistema_agendamento
psql -d sistema_agendamento -f database/01_schema.sql
psql -d sistema_agendamento -f database/02_seed_dev.sql
psql -v ON_ERROR_STOP=1 -d sistema_agendamento -f database/03_testes_regras.sql
```

Requer PostgreSQL 13+. A extensão `btree_gist` é criada pelo próprio `01_schema.sql`
(em serviços gerenciados como Neon, Supabase e Render ela já é liberada).

O arquivo MySQL original (`Sistema-Agendamento (3).sql`, na raiz) foi mantido só como referência.
Detalhes e racional: [`docs/MODELAGEM.md`](../docs/MODELAGEM.md).
