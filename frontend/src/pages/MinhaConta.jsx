import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { BotaoConfirmar, Mensagens } from '../components.jsx';
import { dataExtenso, hojeSP, moeda } from '../utils.js';

const ROTULO = { PENDENTE: 'Aguardando confirmação', CONFIRMADO: 'Confirmado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' };

export default function MinhaConta() {
  const { sessao, sair } = useAuth();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const carregar = useCallback(async () => {
    try { setLista(await api.cliente(sessao.token).agendamentos()); }
    catch (e) {
      if (e.status === 401 || e.status === 403) { sair(); return; }
      setErro(e.message); setLista([]);
    }
  }, [sessao.token, sair]);

  useEffect(() => { carregar(); }, [carregar]);

  async function cancelar(id) {
    setErro(''); setOk('');
    try { await api.cliente(sessao.token).cancelar(id, 'Cancelado pelo cliente'); setOk('Agendamento cancelado.'); await carregar(); }
    catch (e) { setErro(e.message); }
  }

  const hoje = hojeSP();
  const proximos = (lista || []).filter((a) => ['PENDENTE', 'CONFIRMADO'].includes(a.status) && a.data_agendamento >= hoje).reverse();
  const historico = (lista || []).filter((a) => !proximos.includes(a));

  const Item = ({ a, acao }) => (
    <li className={`cartao item item--${a.status.toLowerCase()}`}>
      <div className="item__corpo">
        <p className="item__nome">{a.servico} <span className={`selo selo--${a.status.toLowerCase()}`}>{ROTULO[a.status]}</span></p>
        <p>{dataExtenso(a.data_agendamento)} · {a.hora_inicio} às {a.hora_fim}</p>
        <p className="muted">{moeda(a.preco)} · #{a.id_agendamento}</p>
      </div>
      {acao && <div className="item__acoes">{acao}</div>}
    </li>
  );

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Olá, {sessao.usuario.nome.split(' ')[0]}!</h1>
      <p className="muted">{sessao.usuario.email}{sessao.usuario.telefone ? ` · ${sessao.usuario.telefone}` : ''}</p>
      <div className="acoes acoes--linha"><Link className="btn btn--primario" to="/#servicos">Novo agendamento</Link></div>
      <Mensagens erro={erro} ok={ok} />
      {lista === null && <p>Carregando…</p>}

      {lista && (
        <>
          <h2 className="subtitulo espaco">Próximos agendamentos</h2>
          {proximos.length === 0 && <p className="aviso">Você não tem agendamentos futuros.</p>}
          <ul className="lista">
            {proximos.map((a) => (
              <Item key={a.id_agendamento} a={a}
                acao={<BotaoConfirmar rotulo="Cancelar" pergunta={`Cancelar ${a.servico} em ${a.data_agendamento.split('-').reverse().join('/')}?`} onConfirmar={() => cancelar(a.id_agendamento)} />} />
            ))}
          </ul>

          {historico.length > 0 && (
            <>
              <h2 className="subtitulo espaco">Histórico</h2>
              <ul className="lista">{historico.map((a) => <Item key={a.id_agendamento} a={a} />)}</ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
