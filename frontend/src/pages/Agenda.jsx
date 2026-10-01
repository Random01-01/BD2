import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { dataExtenso, hojeSP, linkWhatsApp, moeda, somarDias } from '../utils.js';

const ROTULO = { PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' };

export default function Agenda() {
  const { sessao, sair } = useAuth();
  const [data, setData] = useState(hojeSP());
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');
  const [cancelando, setCancelando] = useState(null); // id em cancelamento
  const [motivo, setMotivo] = useState('');
  const [aviso, setAviso] = useState('');

  const ultimaConsulta = useRef(0);

  const carregar = useCallback(async () => {
    const minha = ++ultimaConsulta.current; // ignora respostas antigas (troca rápida de dia)
    setErro('');
    try {
      const lista = await api.agenda(sessao.token, data, data);
      if (minha === ultimaConsulta.current) setItens(lista);
    } catch (e) {
      if (minha !== ultimaConsulta.current) return;
      if (e.status === 401) { sair(); return; }
      setErro(e.message); setItens([]);
    }
  }, [data, sessao.token, sair]);

  useEffect(() => { setItens(null); carregar(); }, [carregar]);

  async function mudar(id, status, mot) {
    setErro(''); setAviso('');
    try {
      await api.mudarStatus(sessao.token, id, status, mot);
      setAviso(`Agendamento ${ROTULO[status].toLowerCase()}.`);
      setCancelando(null); setMotivo('');
      await carregar();
    } catch (e) { setErro(e.message); }
  }

  const resumo = useMemo(() => {
    const ativos = (itens || []).filter((i) => i.status !== 'CANCELADO');
    return { qtd: ativos.length, total: ativos.reduce((s, i) => s + Number(i.preco), 0) };
  }, [itens]);

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Agenda</h1>

      <div className="navdia">
        <button type="button" className="btn" onClick={() => setData(somarDias(data, -1))} aria-label="Dia anterior">‹</button>
        <div className="campo campo--inline">
          <label htmlFor="dia" className="sr-only">Dia</label>
          <input id="dia" type="date" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
        </div>
        <button type="button" className="btn" onClick={() => setData(somarDias(data, 1))} aria-label="Próximo dia">›</button>
        <button type="button" className="btn btn--link" onClick={() => setData(hojeSP())}>Hoje</button>
      </div>
      <p className="muted" aria-live="polite">
        {dataExtenso(data)} · {resumo.qtd} atendimento(s) · previsto {moeda(resumo.total)}
      </p>

      <div role="alert" aria-live="assertive">{erro && <p className="erro">{erro}</p>}</div>
      <div role="status">{aviso && <p className="ok">{aviso}</p>}</div>

      {itens === null && <p>Carregando…</p>}
      {itens?.length === 0 && !erro && <p className="aviso">Nenhum agendamento neste dia.</p>}

      <ul className="lista">
        {(itens || []).map((a) => (
          <li key={a.id_agendamento} className={`ag ag--${a.status.toLowerCase()}`}>
            <div className="ag__hora"><strong>{a.hora_inicio}</strong><span>{a.hora_fim}</span></div>
            <div className="ag__corpo">
              <p className="ag__cliente">{a.cliente} <span className={`selo selo--${a.status.toLowerCase()}`}>{ROTULO[a.status]}</span></p>
              <p>{a.servico} · {moeda(a.preco)}</p>
              <p className="muted">
                <a href={linkWhatsApp(a.telefone_cliente)} target="_blank" rel="noreferrer">{a.telefone_cliente} (WhatsApp)</a>
                {' · '}#{a.id_agendamento}
              </p>
              {a.observacao && <p className="muted">Obs.: {a.observacao}</p>}

              {cancelando === a.id_agendamento ? (
                <form className="ag__cancelar" onSubmit={(e) => { e.preventDefault(); mudar(a.id_agendamento, 'CANCELADO', motivo); }}>
                  <label htmlFor={`m${a.id_agendamento}`}>Motivo do cancelamento</label>
                  <input id={`m${a.id_agendamento}`} value={motivo} maxLength={255} onChange={(e) => setMotivo(e.target.value)} autoFocus />
                  <div className="acoes acoes--linha">
                    <button type="submit" className="btn btn--perigo">Confirmar cancelamento</button>
                    <button type="button" className="btn" onClick={() => setCancelando(null)}>Voltar</button>
                  </div>
                </form>
              ) : (
                <div className="acoes acoes--linha">
                  {a.status === 'PENDENTE' && <button type="button" className="btn btn--primario" onClick={() => mudar(a.id_agendamento, 'CONFIRMADO')}>Confirmar</button>}
                  {a.status === 'CONFIRMADO' && <button type="button" className="btn btn--primario" onClick={() => mudar(a.id_agendamento, 'CONCLUIDO')}>Concluir</button>}
                  {['PENDENTE', 'CONFIRMADO'].includes(a.status) && <button type="button" className="btn" onClick={() => { setCancelando(a.id_agendamento); setMotivo(''); }}>Cancelar</button>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
