// Passo entre "escolher serviço" e "agendar": entrar, criar conta ou continuar sem conta.
import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { duracao, moeda } from '../utils.js';

export default function Identificar() {
  const { ehCliente } = useAuth();
  const [params] = useSearchParams();
  const id = Number.parseInt(params.get('servico'), 10);
  const [servico, setServico] = useState(null);
  const destino = `/agendar?servico=${id}`;

  useEffect(() => {
    api.servicos().then((l) => setServico(l.find((s) => s.id_servico === id) ?? null)).catch(() => {});
  }, [id]);

  if (!Number.isInteger(id)) return <Navigate to="/#servicos" replace />;
  if (ehCliente) return <Navigate to={destino} replace />; // já tem conta: segue direto

  return (
    <section className="cartao cartao--medio" aria-labelledby="t">
      <h1 id="t" className="titulo">Como você prefere continuar?</h1>
      {servico && <p className="resumo-linha"><strong>{servico.nome}</strong> · {moeda(servico.preco)} · {duracao(servico.duracao_minutos)}</p>}

      <div className="escolhas">
        <div className="escolha">
          <h2>Entrar</h2>
          <p className="muted">Já tenho conta. Meus dados já ficam preenchidos.</p>
          <Link className="btn btn--primario" to="/entrar" state={{ de: destino }}>Entrar na minha conta</Link>
        </div>
        <div className="escolha">
          <h2>Criar conta</h2>
          <p className="muted">Acompanhe e cancele seus horários sem precisar de número ou telefone.</p>
          <Link className="btn btn--primario" to="/cadastro" state={{ de: destino }}>Criar conta</Link>
        </div>
        <div className="escolha escolha--suave">
          <h2>Sem conta</h2>
          <p className="muted">Informe só nome e telefone na hora de agendar.</p>
          <Link className="btn" to={destino}>Continuar sem conta</Link>
        </div>
      </div>
      <p><Link to="/#servicos">← Escolher outro serviço</Link></p>
    </section>
  );
}
