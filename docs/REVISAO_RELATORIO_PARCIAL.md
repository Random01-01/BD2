# Revisão do Relatório Parcial × projeto atual

> Base: `RELATÓRIO-PARCIAL-PI-2026.pdf` (17 p.), `PLANO DE AÇÃO GRUPO 4.pdf` e o que está no repositório.
> Objetivo: apontar o que precisa ser ajustado **antes do Relatório Final** (entrega 06/11/2026).
> Itens marcados 👥 dependem de decisão ou de informação que só o grupo tem.

## 1. O que o Parcial afirma e o projeto confirma ✅

| Afirmação do relatório | Situação |
|---|---|
| Banco relacional `sistema_agendamento` em MySQL com 7 tabelas | ✔ `database/mysql/01_schema_original.sql` (hoje 8 tabelas, com `bloqueio_agenda`) |
| Trigger impede agendamentos duplicados | ✔ e foi testado pela API (33 testes de API em memória); ver ressalva 2.5 |
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

### 2.4 O texto dos testes (2.5.3) não bate com os próprios prints do relatório 👥
Conferido com as imagens extraídas do PDF (os prints **batem com o `.sql` do repositório**; quem está diferente é o **texto**):

| No texto do relatório | No print / no `.sql` |
|---|---|
| Teste 2: conflito em **2025-06-10, 09:00** | Print: tentativa em **2026-10-06**, 10:00 às 11:00 |
| Mensagem: *"Conflito de horário: profissional já possui agendamento neste período"* | Print: `Error Code: 1644. ERRO: Conflito de horário! Esta profissional já possui agendamento neste intervalo.` |
| Teste 1: "inserção de **4** clientes de teste" | O script cria **3**; o 4º (Mayer) foi inserido à mão no teste. Escrever: "3 clientes do script + 1 inserido manualmente" |
| "Foi desenvolvido **um** trigger" (2.4.2, 2.5.2) | O print `SHOW TRIGGERS` mostra **dois**: `trg_impede_conflito_horario` (INSERT) e `trg_impede_conflito_horario_update` (UPDATE) |
| **Teste 3**: "inserção de um novo agendamento sem conflito, com status confirmado" | **Nenhum print mostra essa inserção.** Nos logs, as duas tentativas de INSERT (#42 e #43) falharam; a consulta final mostra só os 2 agendamentos do script (Ana Paula e Juliana, 06/10/2026) |

**O que fazer:** corrigir o texto para o que os prints mostram. Para o Teste 3, **refazer** (inserir um agendamento em horário livre, por exemplo 06/10/2026 às 14:00) e tirar um print novo do `INSERT` com sucesso e do `SELECT`. Conferir também se cada print está sob o teste certo (o print da lista de clientes com 4 linhas é o do Teste 1).

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
| API | `backend/` (Express: público, cliente e painel) |
| Banco de dados | `database/mysql/` |
| Controle de versão | repositório Git no GitHub |
| Testes | `backend`: 33 testes · `frontend`: 13 testes (fluxo do cliente, conta e painel) |
| Acessibilidade | rótulos, foco, navegação por teclado, `aria-live`, contraste — **falta auditoria** |
| Computação em nuvem | ⏳ **falta publicar** (API + MySQL + front) |

### 2.9 Detalhes de forma
- Texto cita **"Imagem 2"** (p. 13), mas as demais são "Figura 1" e "Figura 2": padronizar (ABNT: *Figura N* + fonte).
- Citação direta com mais de 3 linhas (2.3.1) deve ter recuo de 4 cm, fonte menor e sem aspas (ABNT).
- Conferir a edição vigente da NBR citada nas referências e a formatação de Vanni (2005) (ano entre parênteses fora do padrão das demais).
- Data de acesso das referências: 19/09/2026 (ok), mas confirme que os links ainda abrem.

### 2.10 Outros pontos encontrados na releitura do PDF atual
- **Storyboard citado e ausente (p. 13):** o texto diz que foi elaborado um storyboard e escreve "Imagem 2.", mas o PDF só tem imagens nas páginas 11, 14 e 15. Incluir a figura (com legenda e fonte) ou retirar a frase.
- **Sujeitos da pesquisa (2.4.1):** o texto diz que participaram "proprietária e clientes frequentes", mas os instrumentos citados (observação e entrevista) foram só com a proprietária. Ajustar o texto ou informar como os clientes foram ouvidos.
- **"Perda de clientes" (2.4.1):** aparece como fato, sem evidência no relatório. Atribuir à fala da profissional ou apresentar o dado.
- **Conclusão (p. 16):** diz que o banco é "capaz de substituir o controle manual". Só o banco não substitui nada; reformular como "base" para o sistema. No Final, incluir uma seção própria de **Considerações finais** (resultados, limitações, trabalhos futuros).
- **DER (Figura 1):** o relacionamento `servico` → `categoria_servico` passa por trás da tabela `agendamento`, e parece que a categoria se liga ao agendamento. Reorganizar o layout (categoria ao lado de `servico`) e gerar de novo depois do `02` e do `04` (8 e 9 tabelas, com `bloqueio_agenda` e `conta_cliente`).
- **Prints:** os comentários do SQL aparecem nas imagens ("-- Vai dar ERRO de propósito", "-- Agora vê se entrou bonitinho"). Cortar a imagem ou trocar por comentários neutros.
- **Fundamentação teórica:** hoje só cobre design thinking, aplicações web e gestão de serviços. Para o Final, acrescentar fontes sobre **acessibilidade na web** (ex.: WCAG, do W3C), **API REST**, **banco relacional e transações/concorrência**, **proteção de dados (LGPD, Lei 13.709/2018)** e **usabilidade**. Confirmar cada referência antes de citar.
- **Web Services (2.3.3):** a citação de Freire (2010) fala de serviços web em geral. Se mantiver, ligar ao que o sistema faz (API REST).

## 3. O que o Relatório Final já pode incluir (resultados novos)

- **Arquitetura** em 3 camadas: React → Express → MySQL.
- **Regras de negócio na API:** horários livres calculados a partir da grade semanal, folgas e agendamentos; sem horários no passado; antecedência mínima; cliente identificado pelo telefone.
- **Prevenção de conflitos** em duas camadas (API + trigger) e proteção contra concorrência.
- **Telas:** agendamento do cliente em 3 etapas, cancelamento pelo cliente, login e agenda diária da profissional.
- **Testes automatizados:** 46 (33 API + 13 interface).
- Limitações: ver 2.2 (pagamentos), 2.5 e lembretes de WhatsApp.

## 4. Pendências de validação (não dá para eu inferir) 👥

- Feedback da profissional sobre a **interface** (Parcial só ouviu sobre o DER).
- Decisões: agendamento nasce `CONFIRMADO` ou `PENDENTE`; prazo de cancelamento; passo de horários (30 min).
- Dados reais: serviços, preços e horários da profissional (hoje são fictícios).
