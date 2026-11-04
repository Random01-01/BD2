# Publicar o sistema em um link (hospedagem grátis)

> Objetivo: o grupo (e quem avaliar) abrir o Studio Aurora **num link**, sem instalar nada.
> Custo: **R$ 0**, sem cartão de crédito (conforme as páginas dos serviços em nov/2026; confirme na hora do cadastro).
> Tempo: **cerca de 45 minutos** na primeira vez. Quem faz: **uma pessoa** do grupo (cria as contas) e passa o link aos outros.

## 1. Como fica

```
Celular / computador  ──https──▶  Render (Node: API + site, um serviço só)  ──▶  Aiven (MySQL de verdade)
                                  https://NOME-ESCOLHIDO.onrender.com            banco `sistema_agendamento`
```

- **Render** (plano grátis): roda a API e também entrega o site. É um serviço só, então há **um único link**, com HTTPS e sem problemas de CORS.
- **Aiven** (plano grátis do MySQL): MySQL gerenciado de verdade, com **trigger**, que o sistema exige (por isso não serve TiDB nem PlanetScale).
- O código já está pronto: com o site compilado (`frontend/dist`), a API entrega o site sozinha. Está coberto por testes (`backend/test/site.test.js`).

### Limites do plano grátis (conhecer antes de apresentar)
| Serviço | O que acontece | Como lidar |
|---|---|---|
| Render grátis | Dorme após **15 min sem acesso**; o primeiro acesso depois disso demora cerca de **1 minuto** | Abra o link **5 minutos antes** de mostrar/gravar. Ou deixe um monitor (ex.: UptimeRobot) acessando `/api/saude` a cada 10 min |
| Render grátis | A documentação do Render diz para **não usar para produção** | Serve para demonstração e avaliação, que é o nosso caso. Diga isso no relatório |
| Aiven grátis | Pode **desligar o banco por falta de uso** (avisa por e-mail) | Entre no painel da Aiven e clique em ligar de novo (*Power on*) |
| Os dois | Podem mudar as regras do plano grátis | Confira no site de cada um |

## 2. Domínio gratuito (o "endereço bonito")

**O que dá certo até amanhã (garantido):** o endereço que o Render dá de graça, `https://NOME-ESCOLHIDO.onrender.com`, já com HTTPS. Escolha um nome curto, por exemplo `studio-aurora-pi` (se já existir, o Render pede outro).

**Domínio próprio gratuito (opcional, não dá para garantir amanhã):**
| Opção | O que é | Prazo |
|---|---|---|
| **GitHub Student Developer Pack** | Para estudantes: domínio `.me` ou `.tech` grátis por 1 ano (renova pago). Exige comprovar a matrícula (a UNIVESP precisa ser aceita pelo GitHub Education) | Pode levar dias para aprovar |
| **is-a.dev** | Subdomínio `nome.is-a.dev` grátis, pedido por *pull request* no GitHub (para sites de desenvolvedores) | Até cerca de 1 dia |
| **eu.org** | Subdomínio `nome.eu.org` grátis | Aprovação lenta (dias a semanas) |

Depois de conseguir o domínio: no Render, **Settings → Custom Domains → Add**, e crie no DNS o registro que o Render mostrar (CNAME). O Render emite o HTTPS sozinho.
**Recomendação:** use o `onrender.com` na entrega de 06/11 e deixe o domínio próprio como melhoria.

## 3. Passo a passo

### Parte A. Banco de dados na Aiven (15 min)
1. Entre em **aiven.io** e crie a conta (grátis).
2. **Create service** → escolha **MySQL** → plano **Free** → **Create**. Espere o estado ficar **Running** (alguns minutos).
3. Na página do serviço (aba *Overview*), anote: **Host**, **Port**, **User** (`avnadmin`) e **Password**. **Não** coloque isso em lugar nenhum do Git nem mande no grupo.
4. **Conectar pelo DBeaver:** *Nova conexão* → MySQL, com o Host e a Port da Aiven, usuário `avnadmin` e a senha. Na aba **SSL**, marque **Use SSL** (e, se pedir, desmarque a verificação do certificado do servidor). Em *Driver properties*, se aparecer o erro "Public Key Retrieval", ponha `allowPublicKeyRetrieval=true`. Clique em *Test Connection*.
5. Execute, **nesta ordem**, os arquivos de `database\mysql\`: `01_schema_original.sql` → `02_melhorias.sql` → `03_dev_admin.sql` → `04_conta_cliente.sql`. O `01` cria o banco `sistema_agendamento`. O `02` só uma vez.
6. **Troque a senha do painel agora** (o `03` coloca `admin123`, que não pode ficar num link público). No `cmd`, dentro de `backend`:
   ```
   node -e "console.log(require('bcryptjs').hashSync('SUA_SENHA_FORTE',10))"
   ```
   No DBeaver:
   ```sql
   USE sistema_agendamento;
   UPDATE usuario SET senha_hash = 'COLE_O_HASH_AQUI' WHERE email = 'admin@mariana.com';
   ```
   (Se o DBeaver estiver em modo manual de commit, clique em **Commit**.)
7. **Teste o trigger:** abra `database\mysql\testes\teste_trigger.sql` e rode. A segunda inserção deve falhar com o erro 1644. **Se o trigger não for criado, me avise** (a Aiven pode exigir algum ajuste) e envie a mensagem de erro.
8. Cadastre os serviços/horários reais ou de demonstração (pelo painel, depois).

### Parte B. Publicar no Render (20 min)
1. Entre em **render.com** com a conta do **GitHub** (**Sign in with GitHub**) e autorize o acesso ao repositório `Random01-01/BD2`.
2. **New +** → **Web Service** → escolha o repositório **BD2**.
3. Preencha:

| Campo | Valor |
|---|---|
| **Name** | `studio-aurora-pi` (vira o endereço `.onrender.com`) |
| **Region** | a mais próxima do Brasil (ex.: Ohio ou Virgínia) |
| **Branch** | `arena/01a0efcc-bd2` (onde está este código). Se o grupo copiar para a `Main`, use `Main` |
| **Root Directory** | (vazio) |
| **Runtime** | Node |
| **Build Command** | `npm install --prefix backend && npm install --include=dev --prefix frontend && npm run build --prefix frontend` |
| **Start Command** | `npm start --prefix backend` |
| **Instance Type** | **Free** |

4. Em **Environment Variables**, adicione (uma por uma):

| Variável | Valor |
|---|---|
| `NODE_VERSION` | `22` |
| `DATABASE_URL` | `mysql://avnadmin:SENHA@HOST:PORT/sistema_agendamento` (troque SENHA, HOST e PORT pelos da Aiven; **sem** `?ssl-mode=...` no final; se a senha tiver `@`, `#`, `/` ou `:`, codifique, ex.: `@` → `%40`) |
| `DB_SSL` | `true` |
| `JWT_SECRET` | um texto longo e aleatório (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `TRUST_PROXY` | `1` |

5. **Create Web Service**. Acompanhe o *Logs*; o primeiro deploy leva alguns minutos. Termina com `API no ar` e *Live*.
6. Abra `https://NOME.onrender.com/api/saude`: deve aparecer `{"ok":true}`. Depois abra `https://NOME.onrender.com` (o site).
7. Entre em `/entrar` com `admin@mariana.com` e a **senha forte** que você definiu.

### Parte C. Conferir (10 min)
- [ ] Home carrega com as fotos e os serviços.
- [ ] Agendar sem conta, remarcar, cancelar.
- [ ] Painel: agenda, serviços, clientes, relatórios.
- [ ] No celular: abrir o link e instalar na tela inicial (agora o HTTPS existe, então o PWA instala).
- [ ] Atualizações: cada `git push` na branch escolhida faz o Render publicar de novo (automático).

## 4. Problemas comuns
| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Build falha em `vite: not found` | devDependencies não instaladas | Confirme o `--include=dev` no Build Command |
| `/api/saude` dá erro 500 ou o site mostra "Servidor indisponível" | `DATABASE_URL` errada, banco desligado ou SSL | Confira usuário/senha/host/porta; `DB_SSL=true`; ligue o serviço na Aiven |
| `ECONNREFUSED`/timeout ao conectar | Aiven desligada por inatividade | *Power on* no painel da Aiven |
| `Access denied for user` | Senha com caractere especial | Codifique (`@` → `%40`) |
| Primeira página demora ~1 min | Render dormindo | Normal no plano grátis; abra antes de mostrar |
| Login do painel falha | Senha trocada sem atualizar o hash | Refaça o passo A.6 |
| Página em branco ao recarregar `/admin/...` | Site não foi compilado | Veja os logs do build; o Build Command precisa terminar com `npm run build --prefix frontend` |

## 5. Segurança (o link é público)
- `DATABASE_URL`, `JWT_SECRET` e senhas ficam **somente** nas variáveis do Render. Nada disso entra no GitHub.
- Senha do painel **forte** (passo A.6). Nunca `admin123` ou `admin`.
- Use dados **fictícios** de clientes: o link é público e a LGPD vale mesmo no teste.
- Quem tiver o link pode criar contas e agendar. Para demonstração está ok; se ficar cheio de agendamentos de teste, rode os scripts `01` a `04` de novo na Aiven (e refaça o A.6).
- Não há verificação de e-mail/telefone nem "esqueci a senha" (limitação já registrada).

## 6. E se não der tempo / der problema?
- **Plano B imediato:** túnel `cloudflared` a partir do seu computador (veja `docs/MOBILE.md` e `docs/PASSO_A_PASSO_FINAL.md`, Parte 7): link temporário, MySQL local.
- **Modo demo na nuvem:** no Render, **sem** Aiven: não configure `DATABASE_URL`/`DB_SSL`, e troque o Start Command por `npm run demo --prefix backend`. Os dados ficam em memória e **somem a cada reinício** (login `admin@mariana.com` / `admin123`: **só para demonstração, troque ou avise**). Serve para o grupo ver a interface, mas **não** prova o MySQL.
