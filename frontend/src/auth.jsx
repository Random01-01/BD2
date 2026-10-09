import { createContext, useContext, useMemo, useState } from 'react';

const Ctx = createContext(null);
const CHAVE = 'agendamento.sessao';

// Profissional: sessionStorage (some ao fechar a aba — computador pode ser compartilhado).
// Cliente: localStorage (continua logada no celular por até 7 dias, que é a validade do token).
function ler() {
  try { return JSON.parse(sessionStorage.getItem(CHAVE) || localStorage.getItem(CHAVE)); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(ler);
  const valor = useMemo(() => ({
    sessao,
    ehAdmin: sessao?.usuario?.tipo === 'admin' || (sessao && !sessao.usuario?.tipo),
    ehCliente: sessao?.usuario?.tipo === 'cliente',
    entrar(dados) {
      sessionStorage.removeItem(CHAVE); localStorage.removeItem(CHAVE);
      (dados.usuario?.tipo === 'cliente' ? localStorage : sessionStorage).setItem(CHAVE, JSON.stringify(dados));
      setSessao(dados);
    },
    sair() { sessionStorage.removeItem(CHAVE); localStorage.removeItem(CHAVE); setSessao(null); },
  }), [sessao]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
