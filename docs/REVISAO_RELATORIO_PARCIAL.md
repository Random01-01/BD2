# Revisão do Relatório Parcial × projeto atual

> Base: `RELATÓRIO-PARCIAL-PI-2026.pdf` (17 p.), `PLANO DE AÇÃO GRUPO 4.pdf` e o que está no repositório.
> Objetivo: apontar o que precisa ser ajustado **antes do Relatório Final** (entrega 06/11/2026).
> Itens marcados 👥 dependem de decisão ou de informação que só o grupo tem.

## 1. O que o Parcial afirma e o projeto confirma ✅

| Afirmação do relatório | Situação |
|---|---|
| Banco relacional `sistema_agendamento` em MySQL com 7 tabelas | ✔ `database/mysql/01_schema_original.sql` (hoje 8 tabelas, com `bloqueio_agenda`) |
| Trigger impede agendamentos duplicados | ✔ e foi testado com 19 testes de API; ver ressalva 2.5 |
| Melhorias futuras: interface web responsiva | ✔ feita (`frontend/`, React) |
| Melhorias futuras: lembretes por WhatsApp | ❌ não feito (só link `wa.me` no painel) |

## 2. Inconsistências e riscos

### 2.1 Banco de dados: MySQL × PostgreSQL 👥
- **Plano de Ação** (Quinzenas 4 e 5): "Banco relacional – PostgreSQL", "integração entre React, Node.js/Express e PostgreSQL".
- **Relatório Parcial**: MySQL Workbench 8.0.36, MySQL Server, `localhost:3306`.
- **Decisão atual do grupo:** MySQL.
- **Recomendação:** registrar no Relatório Final que o banco permaneceu MySQL e **por quê** (ex.: já modelado e validado no Parcial; triggers nativos para a regra de conflito). Convém avisar o orientador, já que o plano foi aprovado com PostgreSQL.

### 2.2 Objetivo cita "pagamentos", mas o sistema não tem pagamento 👥
O objetivo geral (p. 6) fala em organizar "clientes, serviços, horários **e pagamentos**", e o Resumo repete. O banco só guarda o `preco_cobrado` de cada agendamento: não há registro de pagamento (forma, pago/pendente). **Opções:** (a) retirar "pagamentos" do texto; ou (b) incluir na Quinzena 5 um campo/tabela de pagamento e um relatório de faturamento.

### 2.3 Número de tabelas e DER desatualizados
O relatório diz **7 tabelas** e mostra o DER da Figura 1. Com `02_melhorias.sql` passam a ser **8** (`bloqueio_agenda`) e `agendamento` ganha `preco_cobrado`. **Refazer o DER** no Workbench (*Database › Reverse Engineer*) depois de rodar o `02` e atualizar o texto das seções 2.4.2 e 2.5.2, e o Resumo.

### 2.4 Testes do Parcial não batem com o `.sql` do repositório 👥
| No relatório | No `.sql` do repositório |
|---|---|
| "inserção de **4** clientes de teste" (e nova cliente "Mayer") | 3 clientes no script |
| Teste de conflito em **2025-06-10, 09:00** | agendamentos de teste em **2026-10-06** |
| Mensagem: *"Conflito de horário: profissional já possui agendamento neste período"* | `ERRO: Conflito de horário! Esta profissional já possui agendamento neste intervalo.` |

Ou seja, o banco usado nos prints difere do script versionado. **Sugestão:** exportar do Workbench o script exato que foi usado nos testes (*Server › Data Export*) e substituir/anexar no repositório, para o Relatório Final ser reproduzível. Se o `01` do repositório divergir, o `02_melhorias.sql` pode precisar de ajuste.

### 2.5 Limite do trigger (convém citar no Final como aprendizado)
O Parcial apresenta o trigger como garantia total. Na prática ele consulta e depois grava: duas reservas **simultâneas** podem passar juntas. A API mitiga com transação `READ COMMITTED` + `SELECT ... FOR UPDATE` na profissional. Vale mencionar na Discussão como limitação encontrada e a solução adotada.

### 2.6 Afirmação sem fonte: "80% dos conflitos de agenda..." (seção 2.5.1) 👥
O número não tem instrumento nem fonte (a coleta foi uma observação e uma entrevista com **uma** profissional). Risco de questionamento na avaliação. **Opções:** informar de onde veio (ex.: "segundo a profissional, a maior parte dos conflitos…") ou reescrever de forma qualitativa.

### 2.7 "Teste de usabilidade" foi só apresentação do DER
A seção 2.4.3 chama de teste de usabilidade a apresentação do **diagrama** à proprietária. Usabilidade de verdade só pode ser avaliada com a interface. **Para o Final** (Quinzena 6): testar o `frontend/` com a profissional e 2–3 clientes e registrar tarefa, tempo, dificuldades e sugestões.

### 2.8 Metodologia sem as tecnologias do tema norteador
O Parcial cobre só MySQL. O tema norteador (Plano, p. 5–6) cita **JavaScript, API, computação em nuvem, acessibilidade, controle de versão e testes**. O Final precisa mostrar cada um:

| Item do tema | Evidência no projeto |
|---|---|
| JavaScript / React | `frontend/` |
| API | `backend/` (Express, 8 endpoints) |
| Banco de dados | `database/mysql/` |
| Controle de versão | repositório Git no GitHub |
| Testes | `backend`: 19 testes · `frontend`: 5 testes (fluxo do cliente e do painel) |
| Acessibilidade | rótulos, foco, navegação por teclado, `aria-live`, contraste — **falta auditoria** |
| Computação em nuvem | ⏳ **falta publicar** (API + MySQL + front) |

### 2.9 Detalhes de forma
- Texto cita **"Imagem 2"** (p. 13), mas as demais são "Figura 1" e "Figura 2": padronizar (ABNT: *Figura N* + fonte).
- Citação direta com mais de 3 linhas (2.3.1) deve ter recuo de 4 cm, fonte menor e sem aspas (ABNT).
- Conferir a edição vigente da NBR citada nas referências e a formatação de Vanni (2005) (ano entre parênteses fora do padrão das demais).
- Data de acesso das referências: 19/09/2026 (ok), mas confirme que os links ainda abrem.

## 3. O que o Relatório Final já pode incluir (resultados novos)

- **Arquitetura** em 3 camadas: React → Express → MySQL.
- **Regras de negócio na API:** horários livres calculados a partir da grade semanal, folgas e agendamentos; sem horários no passado; antecedência mínima; cliente identificado pelo telefone.
- **Prevenção de conflitos** em duas camadas (API + trigger) e proteção contra concorrência.
- **Telas:** agendamento do cliente em 3 etapas, cancelamento pelo cliente, login e agenda diária da profissional.
- **Testes automatizados:** 24 (19 API + 5 interface).
- Limitações: ver 2.2 (pagamentos), 2.5 e lembretes de WhatsApp.

## 4. Pendências de validação (não dá para eu inferir) 👥

- Feedback da profissional sobre a **interface** (Parcial só ouviu sobre o DER).
- Decisões: agendamento nasce `CONFIRMADO` ou `PENDENTE`; prazo de cancelamento; passo de horários (30 min).
- Dados reais: serviços, preços e horários da profissional (hoje são fictícios).
