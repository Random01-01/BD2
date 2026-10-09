// Login único: a profissional vai para o painel, a cliente para "Minha conta" (ou de volta ao agendamento).
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Mensagens } from '../components.jsx';

export function destinoPosLogin(tipo, de) {
  if (tipo === 'admin') return de?.startsWith('/admin') ? de : '/admin';
  return de && !de.startsWith('/admin') ? de : '/minha-conta';
}

export default function Login() {
  const { sessao, entrar } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (sessao) return <Navigate to={destinoPosLogin(sessao.usuario?.tipo ?? 'admin', state?.de)} replace />;

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setEnviando(true);
    try {
      const dados = await api.login(email, senha);
      entrar(dados);
      navegar(destinoPosLogin(dados.usuario.tipo, state?.de), { replace: true });
    } catch (err) { setErro(err.message); }
    finally { setEnviando(false); }
  }

  return (
    <section className="cartao cartao--estreito" aria-labelledby="t">
      <h1 id="t" className="titulo">Entrar</h1>
      <p className="muted">Para clientes e para a profissional.</p>
      <Mensagens erro={erro} />
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
      <p className="centro">Ainda não tem conta? <Link to="/cadastro" state={state}>Criar conta</Link></p>
    </section>
  );
}
