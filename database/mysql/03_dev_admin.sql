-- ==========================================================
-- SOMENTE DESENVOLVIMENTO: define uma senha de teste para o painel.
-- Login: admin@mariana.com / admin123
-- (o hash do script original é só um exemplo e não é um bcrypt válido)
-- Em produção, NÃO rode este script: cadastre uma senha forte própria.
-- ==========================================================
USE sistema_agendamento;

UPDATE usuario
   SET senha_hash = '$2b$10$3tguubGA0XRvd6kXoQWnw.bLiH4kELYfgLueCOFGs2H67NU8D85.a'
 WHERE email = 'admin@mariana.com';
