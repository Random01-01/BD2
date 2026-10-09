import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Mensagens, mensagemDeErro } from '../components.jsx';
import { mascararTelefone } from '../utils.js';
import { destinoPosLogin } from './Login.jsx';

export default function Cadastro() {
  const { sessao, entrar } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation();
  const [f, setF] = useState({ nome: '', telefone: '', email: '', senha: '', confirmar: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (sessao) return <Navigate to={destinoPosLogin(sessao.usuario?.tipo ?? 'admin', state?.de)} replace />;

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'telefone' ? mascararTelefone(e.target.value) : e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    if (f.senha !== f.confirmar) { setErro('As senhas não conferem.'); return; }
    setErro(''); setEnviando(true);
    try {
      const dados = await api.cadastro({ nome: f.nome, telefone: f.telefone, email: f.email, senha: f.senha });
      entrar(dados);
      navegar(destinoPosLogin('cliente', state?.de), { replace: true });
    } catch (err) { setErro(mensagemDeErro(err)); }
    finally { setEnviando(false); }
  }

  return (
    <section className="cartao cartao--estreito" aria-labelledby="t">
      <h1 id="t" className="titulo">Criar conta</h1>
      <p className="muted">Leva menos de um minuto. A conta é opcional: você também pode agendar sem ela.</p>
      <Mensagens erro={erro} />
      <form onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="nome">Nome completo</label>
          <input id="nome" required minLength={2} maxLength={100} autoComplete="name" value={f.nome} onChange={set('nome')} />
        </div>
        <div className="campo">
          <label htmlFor="tel">Telefone (WhatsApp)</label>
          <input id="tel" required inputMode="tel" autoComplete="tel" placeholder="(18) 99999-9999" pattern="\(\d{2}\) \d{4,5}-\d{4}"
            title="Informe com DDD, ex.: (18) 99999-9999" value={f.telefone} onChange={set('telefone')} />
        </div>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" required autoComplete="email" maxLength={100} value={f.email} onChange={set('email')} />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.senha} onChange={set('senha')} aria-describedby="senha-ajuda" />
          <small id="senha-ajuda">Mínimo de 8 caracteres.</small>
        </div>
        <div className="campo">
          <label htmlFor="confirmar">Repita a senha</label>
          <input id="confirmar" type="password" required autoComplete="new-password" value={f.confirmar} onChange={set('confirmar')} />
        </div>
        <div className="acoes"><button type="submit" className="btn btn--primario" disabled={enviando}>{enviando ? 'Criando…' : 'Criar conta'}</button></div>
      </form>
      <p className="centro">Já tem conta? <Link to="/entrar" state={state}>Entrar</Link></p>
    </section>
  );
}
