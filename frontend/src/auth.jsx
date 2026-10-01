import { createContext, useContext, useMemo, useState } from 'react';

const Ctx = createContext(null);
const CHAVE = 'agendamento.sessao';

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(CHAVE)); } catch { return null; }
  });
  const valor = useMemo(() => ({
    sessao,
    entrar(dados) { sessionStorage.setItem(CHAVE, JSON.stringify(dados)); setSessao(dados); },
    sair() { sessionStorage.removeItem(CHAVE); setSessao(null); },
  }), [sessao]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
