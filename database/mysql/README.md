# Banco de dados (MySQL 8) — base do Relatório Parcial

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `01_schema_original.sql` | Banco entregue no Relatório Parcial: 7 tabelas, trigger anti-conflito e dados de teste (**recria** o banco `sistema_agendamento`) |
| 2 | `02_melhorias.sql` | `preco_cobrado`, validações `CHECK`, índice por telefone e tabela `bloqueio_agenda` |
| 3 | `03_dev_admin.sql` | **Só desenvolvimento.** Senha de teste do painel: `admin@mariana.com` / `admin123` |
| 4 | `04_conta_cliente.sql` | Tabela `conta_cliente` (login opcional de cliente). Pode rodar mais de uma vez |

> `01_schema_original.sql` é idêntico ao arquivo `Sistema-Agendamento (3).sql` da raiz do repositório (mantido lá por ser o arquivo entregue). Se alterar um, altere o outro.

## Opção A — MySQL Workbench (como no relatório)
Abra e execute (⚡) cada arquivo, **na ordem 1 → 2 → 3**, conectado em `localhost:3306`.
Rode o `02` apenas uma vez; se rodar de novo dá erro de "coluna/constraint já existe" (é esperado — para recomeçar, rode o `01` novamente, que recria tudo).

## Opção B — Docker (um comando, sem instalar MySQL)
Na raiz do projeto:
```bash
docker compose up -d      # cria o MySQL já com os 3 scripts aplicados
docker compose down -v    # apaga tudo para recomeçar
```
Conexão: `mysql://root:agendamento_dev@localhost:3306/sistema_agendamento`

## Conexão da API
No `backend/.env`: `DATABASE_URL=mysql://root:SUA_SENHA@localhost:3306/sistema_agendamento`

> Conferir se o MySQL é **8.0.16 ou mais novo** (`SELECT VERSION();`). O Workbench 8.0.36 do relatório atende.
> Bancos "MySQL compatíveis" em nuvem (ex.: TiDB) **não suportam triggers**, que são a regra central daqui; prefira MySQL de verdade.

## Alternativa PostgreSQL
A versão do Plano de Ação (PostgreSQL/Supabase) está em `../postgres/` e **não é usada no momento**.
