-- ==========================================================
-- SEGURANÇA PARA SUPABASE (Row Level Security)
-- Rode DEPOIS de 01_schema.sql (e do seed, se quiser).
--
-- Por que: o Supabase expõe automaticamente as tabelas do schema
-- "public" numa API pública (Data API) acessível com a chave "anon",
-- que fica visível no navegador. Sem RLS, qualquer pessoa poderia
-- ler/alterar clientes, agendamentos e senhas.
--
-- Nossa arquitetura: React -> API Node/Express -> PostgreSQL.
-- Só o back-end fala com o banco (usuário "postgres", que ignora RLS).
-- Portanto: RLS ligado + nenhuma policy + sem permissões para anon/authenticated
-- = a Data API do Supabase não enxerga nada. O Node continua funcionando.
-- ==========================================================

-- 1. Liga RLS em todas as tabelas (sem policies = acesso negado para quem não é dono)
ALTER TABLE profissional       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_servico  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente            ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario            ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico            ENABLE ROW LEVEL SECURITY;
ALTER TABLE horario_disponivel ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloqueio_agenda    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamento        ENABLE ROW LEVEL SECURITY;

-- 2. Retira permissões dos papéis públicos do Supabase (só existem no Supabase)
DO $$
DECLARE r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM %I', r);
            EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
            EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
            RAISE NOTICE 'Permissões públicas removidas do papel %', r;
        END IF;
    END LOOP;
END $$;

-- 3. A view respeita as permissões de quem consulta (PostgreSQL 15+, padrão no Supabase)
DO $$
BEGIN
    IF current_setting('server_version_num')::int >= 150000 THEN
        ALTER VIEW vw_agenda SET (security_invoker = true);
    END IF;
END $$;
