-- ============================================================================
-- 04_conta_cliente.sql — conta OPCIONAL de cliente (login com e-mail e senha)
-- Rode depois do 02_melhorias.sql. Pode ser executado mais de uma vez.
--
-- Por que uma tabela separada e não colunas em `cliente`?
--   * quem agenda sem conta continua só na tabela `cliente`, como no Relatório Parcial;
--   * a tabela original não muda;
--   * e-mail único só para quem tem conta (em `cliente` o e-mail pode repetir).
-- ============================================================================
USE sistema_agendamento;

CREATE TABLE IF NOT EXISTS conta_cliente (
    id_conta   INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL UNIQUE,
    email      VARCHAR(100) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conta_cliente FOREIGN KEY (id_cliente) REFERENCES cliente (id_cliente) ON DELETE CASCADE
) ENGINE=InnoDB;
