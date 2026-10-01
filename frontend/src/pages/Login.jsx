import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { sessao, entrar } = useAuth();
  const navegar = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (sessao) return <Navigate to="/admin" replace />;

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setEnviando(true);
    try { entrar(await api.login(email, senha)); navegar('/admin'); }
    catch (err) { setErro(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <section className="cartao cartao--estreito" aria-labelledby="t">
      <h1 id="t" className="titulo">Área da profissional</h1>
      <div role="alert" aria-live="assertive">{erro && <p className="erro">{erro}</p>}</div>
      <form onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <div className="acoes"><button type="submit" className="btn btn--primario" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button></div>
      </form>
    </section>
  );
}
