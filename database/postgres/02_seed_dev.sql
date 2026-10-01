-- ==========================================================
-- DADOS DE TESTE (somente desenvolvimento!)
-- Login do painel: admin@mariana.com / admin123
-- O hash abaixo é um bcrypt real (custo 10) dessa senha de teste.
-- Troque/remova em produção.
-- ==========================================================

INSERT INTO profissional (nome, telefone, email)
VALUES ('Mariana Souza', '(18) 99999-1111', 'mariana@email.com');

INSERT INTO categoria_servico (nome)
VALUES ('Cabelo'), ('Estética'), ('Manicure e Pedicure');

INSERT INTO usuario (id_profissional, nome, email, senha_hash)
VALUES (1, 'Mariana Admin', 'admin@mariana.com', '$2b$10$3tguubGA0XRvd6kXoQWnw.bLiH4kELYfgLueCOFGs2H67NU8D85.a');

INSERT INTO cliente (nome, telefone, email) VALUES
('Ana Paula',      '(18) 98888-2222', 'ana@email.com'),
('Juliana Santos', '(18) 97777-3333', 'juliana@email.com'),
('Carla Mendes',   '(18) 96666-4444', 'carla@email.com');

INSERT INTO servico (id_profissional, id_categoria, nome, descricao, preco, duracao_minutos) VALUES
(1, 1, 'Corte feminino',        'Corte de cabelo feminino', 60.00,  60),
(1, 1, 'Escova',                'Escova modelada',          45.00,  45),
(1, 1, 'Coloração',             'Coloração completa',       150.00, 120),
(1, 2, 'Design de sobrancelha', 'Design com henna',         50.00,  30);

-- dia_semana: 1=Segunda ... 6=Sábado (0=Domingo, sem atendimento)
INSERT INTO horario_disponivel (id_profissional, dia_semana, hora_inicio, hora_fim) VALUES
(1, 1, '09:00', '18:00'),
(1, 2, '09:00', '18:00'),
(1, 3, '09:00', '18:00'),
(1, 4, '09:00', '18:00'),
(1, 5, '09:00', '18:00'),
(1, 6, '09:00', '13:00');

INSERT INTO agendamento
    (id_cliente, id_servico, id_profissional, data_agendamento, hora_inicio, hora_fim, preco_cobrado, status)
VALUES
(1, 1, 1, '2026-10-06', '10:00', '11:00',  60.00, 'CONFIRMADO'),
(2, 2, 1, '2026-10-06', '11:30', '12:15',  45.00, 'CONFIRMADO');
