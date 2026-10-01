import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Agenda from './pages/Agenda.jsx';
import Agendar from './pages/Agendar.jsx';
import CancelarAgendamento from './pages/CancelarAgendamento.jsx';
import Login from './pages/Login.jsx';

function RotaProtegida({ children }) {
  const { sessao } = useAuth();
  return sessao ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  const { pathname } = useLocation();
  const { sessao, sair } = useAuth();
  const admin = pathname.startsWith('/admin');

  // Leitores de tela: avisa a troca de página e leva o foco para o conteúdo
  useEffect(() => { document.getElementById('conteudo')?.focus(); window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <header className="topo">
        <div className="topo__interno">
          <Link to="/" className="marca">✂ Agendamento<span className="marca__sub"> online</span></Link>
          <nav aria-label="Principal" className="topo__nav">
            {!admin && <Link to="/cancelar">Cancelar horário</Link>}
            {admin && sessao ? (
              <>
                <span className="topo__usuario">{sessao.usuario.nome}</span>
                <button type="button" className="btn btn--link" onClick={sair}>Sair</button>
              </>
            ) : (
              <Link to={sessao ? '/admin' : '/admin/login'}>Área da profissional</Link>
            )}
          </nav>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="conteudo">
        <Routes>
          <Route path="/" element={<Agendar />} />
          <Route path="/cancelar" element={<CancelarAgendamento />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<RotaProtegida><Agenda /></RotaProtegida>} />
          <Route path="*" element={<p>Página não encontrada. <Link to="/">Voltar ao início</Link></p>} />
        </Routes>
      </main>

      <footer className="rodape">Projeto Integrador UNIVESP · Grupo 4</footer>
    </>
  );
}
