-- ==========================================================
-- SISTEMA DE AGENDAMENTO - ESQUEMA POSTGRESQL
-- UNIVESP - Projeto Integrador em Computação II (Grupo 4)
-- Requer PostgreSQL 13+ (extensão btree_gist é "trusted").
--
-- Adaptação de "Sistema-Agendamento (3).sql" (MySQL) para a stack
-- definida no Plano de Ação: React + Node/Express + PostgreSQL.
--
-- Uso (dentro de um banco vazio):
--   psql -d sistema_agendamento -f database/01_schema.sql
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Tipos -----------------------------------------------------
CREATE TYPE status_agendamento AS ENUM ('PENDENTE', 'CONFIRMADO', 'CONCLUIDO', 'CANCELADO');

-- 1. PROFISSIONAL -------------------------------------------
CREATE TABLE profissional (
    id_profissional INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            VARCHAR(100) NOT NULL,
    telefone        VARCHAR(20),
    email           VARCHAR(100) NOT NULL UNIQUE,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. CATEGORIA DE SERVIÇO -----------------------------------
CREATE TABLE categoria_servico (
    id_categoria INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome         VARCHAR(50) NOT NULL UNIQUE
);

-- 3. CLIENTE ------------------------------------------------
-- O telefone identifica o cliente no agendamento público (sem login).
-- A API deve normalizar (somente dígitos) antes de gravar/buscar.
CREATE TABLE cliente (
    id_cliente INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    telefone   VARCHAR(20)  NOT NULL UNIQUE,
    email      VARCHAR(100),
    criado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 4. USUÁRIO ADMINISTRATIVO ---------------------------------
CREATE TABLE usuario (
    id_usuario      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_profissional INTEGER      NOT NULL
        REFERENCES profissional(id_profissional) ON DELETE CASCADE ON UPDATE CASCADE,
    nome            VARCHAR(100) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    senha_hash      VARCHAR(255) NOT NULL,          -- bcrypt/argon2, nunca senha pura
    perfil          VARCHAR(30)  NOT NULL DEFAULT 'ADMIN'
        CHECK (perfil IN ('ADMIN', 'PROFISSIONAL')),
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 5. SERVIÇO ------------------------------------------------
CREATE TABLE servico (
    id_servico      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_profissional INTEGER       NOT NULL
        REFERENCES profissional(id_profissional) ON DELETE CASCADE ON UPDATE CASCADE,
    id_categoria    INTEGER
        REFERENCES categoria_servico(id_categoria) ON DELETE SET NULL ON UPDATE CASCADE,
    nome            VARCHAR(100)  NOT NULL,
    descricao       TEXT,
    preco           NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
    duracao_minutos INTEGER       NOT NULL CHECK (duracao_minutos > 0),
    ativo           BOOLEAN       NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- necessário para a FK composta de agendamento (serviço pertence à profissional)
    UNIQUE (id_servico, id_profissional)
);

-- 6. HORÁRIO DISPONÍVEL (grade semanal recorrente) ----------
-- dia_semana segue o padrão do JavaScript (Date.getDay()):
--   0=Domingo 1=Segunda 2=Terça 3=Quarta 4=Quinta 5=Sexta 6=Sábado
-- Para pausa de almoço, cadastre duas janelas no mesmo dia (09-12 e 14-18).
CREATE TABLE horario_disponivel (
    id_horario      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_profissional INTEGER  NOT NULL
        REFERENCES profissional(id_profissional) ON DELETE CASCADE ON UPDATE CASCADE,
    dia_semana      SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio     TIME     NOT NULL,
    hora_fim        TIME     NOT NULL,
    CHECK (hora_fim > hora_inicio),
    -- impede janelas sobrepostas no mesmo dia da semana
    CONSTRAINT ex_horario_sem_sobreposicao EXCLUDE USING gist (
        id_profissional WITH =,
        dia_semana      WITH =,
        tsrange(DATE '2000-01-01' + hora_inicio, DATE '2000-01-01' + hora_fim, '[)') WITH &&
    )
);

-- 7. BLOQUEIO DE AGENDA (folgas, feriados, férias) ----------
CREATE TABLE bloqueio_agenda (
    id_bloqueio     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_profissional INTEGER      NOT NULL
        REFERENCES profissional(id_profissional) ON DELETE CASCADE ON UPDATE CASCADE,
    data_inicio     DATE         NOT NULL,
    data_fim        DATE         NOT NULL,
    motivo          VARCHAR(255),
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (data_fim >= data_inicio)
);

-- 8. AGENDAMENTO --------------------------------------------
CREATE TABLE agendamento (
    id_agendamento      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cliente          INTEGER NOT NULL
        REFERENCES cliente(id_cliente) ON UPDATE CASCADE,
    id_servico          INTEGER NOT NULL,
    id_profissional     INTEGER NOT NULL
        REFERENCES profissional(id_profissional) ON UPDATE CASCADE,
    data_agendamento    DATE    NOT NULL,
    hora_inicio         TIME    NOT NULL,
    hora_fim            TIME    NOT NULL,
    preco_cobrado       NUMERIC(10,2) CHECK (preco_cobrado >= 0),  -- "foto" do preço na criação
    status              status_agendamento NOT NULL DEFAULT 'CONFIRMADO',
    observacao          TEXT,
    motivo_cancelamento VARCHAR(255),
    data_cancelamento   TIMESTAMPTZ,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (hora_fim > hora_inicio),
    CHECK (status <> 'CANCELADO' OR data_cancelamento IS NOT NULL),

    -- o serviço tem que pertencer à mesma profissional do agendamento
    CONSTRAINT fk_agendamento_servico_profissional
        FOREIGN KEY (id_servico, id_profissional)
        REFERENCES servico (id_servico, id_profissional) ON UPDATE CASCADE,

    -- REGRA CENTRAL: sem sobreposição de horários para a mesma profissional.
    -- Substitui os triggers do MySQL e é segura contra requisições simultâneas.
    -- Agendamentos CANCELADOS liberam o horário.
    CONSTRAINT ex_agendamento_sem_conflito EXCLUDE USING gist (
        id_profissional WITH =,
        tsrange(data_agendamento + hora_inicio, data_agendamento + hora_fim, '[)') WITH &&
    ) WHERE (status <> 'CANCELADO')
);

CREATE INDEX idx_agendamento_data_prof ON agendamento (data_agendamento, id_profissional, hora_inicio);
CREATE INDEX idx_agendamento_cliente   ON agendamento (id_cliente);
CREATE INDEX idx_bloqueio_periodo      ON bloqueio_agenda (id_profissional, data_inicio, data_fim);

-- 9. VIEW: AGENDA (usada pelo painel administrativo) --------
CREATE VIEW vw_agenda AS
SELECT a.id_agendamento,
       a.id_profissional,
       a.data_agendamento,
       a.hora_inicio,
       a.hora_fim,
       a.status,
       a.observacao,
       c.id_cliente,
       c.nome      AS cliente,
       c.telefone  AS telefone_cliente,
       s.id_servico,
       s.nome      AS servico,
       COALESCE(a.preco_cobrado, s.preco) AS preco
FROM agendamento a
JOIN cliente c ON c.id_cliente = a.id_cliente
JOIN servico s ON s.id_servico = a.id_servico;
