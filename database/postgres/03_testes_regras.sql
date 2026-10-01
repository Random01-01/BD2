-- ==========================================================
-- TESTES DAS REGRAS DE NEGÓCIO DO BANCO
-- Rode depois de 01_schema.sql e 02_seed_dev.sql.
-- Tudo roda em transação e termina com ROLLBACK (não suja o banco).
-- Se alguma regra falhar, o script aborta com "FALHOU: ...".
--   psql -v ON_ERROR_STOP=1 -d sistema_agendamento -f database/03_testes_regras.sql
-- ==========================================================
BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.deve_falhar(descricao TEXT, comando TEXT, sqlstate_esperado TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE comando;
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = sqlstate_esperado THEN
            RAISE NOTICE 'OK     : %', descricao;
            RETURN;
        END IF;
        RAISE EXCEPTION 'FALHOU: % (erro inesperado % - %)', descricao, SQLSTATE, SQLERRM;
    END;
    RAISE EXCEPTION 'FALHOU: % (deveria ter sido bloqueado)', descricao;
END $$;

-- 23P01 = exclusion_violation | 23514 = check_violation | 23503 = foreign_key_violation | 23505 = unique_violation

-- 1. Conflito total
SELECT pg_temp.deve_falhar('mesmo horário já ocupado',
 $q$INSERT INTO agendamento (id_cliente,id_servico,id_profissional,data_agendamento,hora_inicio,hora_fim)
    VALUES (3,1,1,'2026-10-06','10:00','11:00')$q$, '23P01');

-- 2. Conflito parcial (início dentro de um existente)
SELECT pg_temp.deve_falhar('sobreposição parcial (10:30-11:30)',
 $q$INSERT INTO agendamento (id_cliente,id_servico,id_profissional,data_agendamento,hora_inicio,hora_fim)
    VALUES (3,1,1,'2026-10-06','10:30','11:30')$q$, '23P01');

-- 3. Horários encostados NÃO conflitam (11:00-11:30 fica entre os dois seeds)
INSERT INTO agendamento (id_cliente,id_servico,id_profissional,data_agendamento,hora_inicio,hora_fim)
VALUES (3,4,1,'2026-10-06','11:00','11:30');
DO $$ BEGIN RAISE NOTICE 'OK     : horários adjacentes são permitidos'; END $$;

-- 4. Cancelar libera o horário
UPDATE agendamento SET status='CANCELADO', motivo_cancelamento='Teste', data_cancelamento=now()
WHERE id_agendamento = 1;
INSERT INTO agendamento (id_cliente,id_servico,id_profissional,data_agendamento,hora_inicio,hora_fim)
VALUES (3,1,1,'2026-10-06','10:00','11:00');
DO $$ BEGIN RAISE NOTICE 'OK     : cancelamento libera o horário'; END $$;

-- 5. Reativar o cancelado em horário agora ocupado é bloqueado
SELECT pg_temp.deve_falhar('reativar agendamento em horário ocupado',
 $q$UPDATE agendamento SET status='CONFIRMADO' WHERE id_agendamento = 1$q$, '23P01');

-- 6. Mesmo horário em outro dia é permitido
INSERT INTO agendamento (id_cliente,id_servico,id_profissional,data_agendamento,hora_inicio,hora_fim)
VALUES (3,1,1,'2026-10-07','10:00','11:00');
DO $$ BEGIN RAISE NOTICE 'OK     : mesmo horário em outro dia é permitido'; END $$;

-- 7. hora_fim <= hora_inicio
SELECT pg_temp.deve_falhar('hora_fim antes de hora_inicio',
 $q$INSERT INTO agendamento (id_cliente,id_servico,id_profissional,data_agendamento,hora_inicio,hora_fim)
    VALUES (3,1,1,'2026-10-08','11:00','10:00')$q$, '23514');

-- 8. Cancelamento exige data_cancelamento
SELECT pg_temp.deve_falhar('status CANCELADO sem data_cancelamento',
 $q$UPDATE agendamento SET status='CANCELADO' WHERE id_agendamento = 2$q$, '23514');

-- 9. Serviço de outra profissional
INSERT INTO profissional (nome,email) VALUES ('Outra Profissional','outra@email.com');
SELECT pg_temp.deve_falhar('serviço não pertence à profissional do agendamento',
 $q$INSERT INTO agendamento (id_cliente,id_servico,id_profissional,data_agendamento,hora_inicio,hora_fim)
    VALUES (3,1,2,'2026-10-09','10:00','11:00')$q$, '23503');

-- 10. Janelas de atendimento sobrepostas
SELECT pg_temp.deve_falhar('janela de atendimento sobreposta',
 $q$INSERT INTO horario_disponivel (id_profissional,dia_semana,hora_inicio,hora_fim)
    VALUES (1,1,'17:00','19:00')$q$, '23P01');

-- 11. Janela inválida
SELECT pg_temp.deve_falhar('janela com hora_fim <= hora_inicio',
 $q$INSERT INTO horario_disponivel (id_profissional,dia_semana,hora_inicio,hora_fim)
    VALUES (1,0,'12:00','09:00')$q$, '23514');

-- 12. Pausa de almoço (duas janelas no mesmo dia) é permitida
INSERT INTO horario_disponivel (id_profissional,dia_semana,hora_inicio,hora_fim)
VALUES (2,1,'09:00','12:00'), (2,1,'14:00','18:00');
DO $$ BEGIN RAISE NOTICE 'OK     : duas janelas no mesmo dia (almoço) permitidas'; END $$;

-- 13. Telefone duplicado
SELECT pg_temp.deve_falhar('telefone de cliente duplicado',
 $q$INSERT INTO cliente (nome,telefone) VALUES ('Dup','(18) 98888-2222')$q$, '23505');

-- 14. Preço / duração inválidos
SELECT pg_temp.deve_falhar('duração de serviço zero',
 $q$INSERT INTO servico (id_profissional,nome,preco,duracao_minutos) VALUES (1,'X',10,0)$q$, '23514');

-- 15. Excluir serviço com histórico é bloqueado (use ativo = FALSE)
SELECT pg_temp.deve_falhar('excluir serviço que tem agendamentos',
 $q$DELETE FROM servico WHERE id_servico = 2$q$, '23503');

-- 16. View da agenda
DO $$
DECLARE n INT;
BEGIN
    SELECT count(*) INTO n FROM vw_agenda WHERE data_agendamento = '2026-10-06' AND status <> 'CANCELADO';
    IF n <> 3 THEN RAISE EXCEPTION 'FALHOU: vw_agenda retornou % linhas (esperado 3)', n; END IF;
    RAISE NOTICE 'OK     : vw_agenda';
END $$;

ROLLBACK;
