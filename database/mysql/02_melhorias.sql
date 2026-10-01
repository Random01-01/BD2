-- ==========================================================
-- MELHORIAS SOBRE O BANCO ORIGINAL (MySQL 8.0.16+)
-- Rode DEPOIS de 01_schema_original.sql, UMA ÚNICA VEZ.
-- Não apaga nada: só acrescenta colunas, regras e a tabela de folgas.
-- ==========================================================
USE sistema_agendamento;

-- O Workbench bloqueia UPDATE sem chave (erro 1175). Desligamos só durante este script.
SET @safe_antigo = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- 1. Preço cobrado no agendamento (o histórico não muda se o preço do serviço mudar)
ALTER TABLE agendamento ADD COLUMN preco_cobrado DECIMAL(10,2) NULL AFTER hora_fim;
UPDATE agendamento a
  JOIN servico s ON s.id_servico = a.id_servico
   SET a.preco_cobrado = s.preco
 WHERE a.preco_cobrado IS NULL;

-- 2. Validações (CHECK exige MySQL 8.0.16+; em versões antigas é aceito, mas ignorado)
ALTER TABLE agendamento        ADD CONSTRAINT chk_agendamento_horas CHECK (hora_fim > hora_inicio);
ALTER TABLE horario_disponivel ADD CONSTRAINT chk_horario_horas     CHECK (hora_fim > hora_inicio);
ALTER TABLE servico            ADD CONSTRAINT chk_servico_valores   CHECK (preco >= 0 AND duracao_minutos > 0);

-- 3. Busca de cliente por telefone (a API identifica o cliente pelo telefone)
CREATE INDEX idx_cliente_telefone ON cliente (telefone);

-- 4. Folgas, feriados e férias
CREATE TABLE IF NOT EXISTS bloqueio_agenda (
    id_bloqueio     INT AUTO_INCREMENT PRIMARY KEY,
    id_profissional INT NOT NULL,
    data_inicio     DATE NOT NULL,
    data_fim        DATE NOT NULL,
    motivo          VARCHAR(255),
    criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bloqueio_profissional FOREIGN KEY (id_profissional)
        REFERENCES profissional(id_profissional) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_bloqueio_datas CHECK (data_fim >= data_inicio),
    INDEX idx_bloqueio_periodo (id_profissional, data_inicio, data_fim)
) ENGINE=InnoDB;

SET SQL_SAFE_UPDATES = @safe_antigo;
