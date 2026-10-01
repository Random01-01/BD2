import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { BotaoConfirmar, Mensagens, mensagemDeErro } from '../../components.jsx';
import { DIAS_SEMANA, dataCurta, hojeSP } from '../../utils.js';

const ORDEM = [1, 2, 3, 4, 5, 6, 0]; // segunda a domingo

export default function Horarios() {
  const { sessao } = useAuth();
  const adm = api.admin(sessao.token);
  const [horarios, setHorarios] = useState(null);
  const [bloqueios, setBloqueios] = useState([]);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [aviso, setAviso] = useState('');
  const [novo, setNovo] = useState({ dia_semana: 1, hora_inicio: '09:00', hora_fim: '18:00' });
  const [folga, setFolga] = useState({ data_inicio: '', data_fim: '', motivo: '' });

  const carregar = useCallback(async () => {
    try {
      const [h, b] = await Promise.all([api.admin(sessao.token).horarios(), api.admin(sessao.token).bloqueios()]);
      setHorarios(h); setBloqueios(b);
    } catch (e) { setErro(e.message); }
  }, [sessao.token]);

  useEffect(() => { carregar(); }, [carregar]);

  async function executar(acao, msg) {
    setErro(''); setOk(''); setAviso('');
    try { const r = await acao(); setOk(msg); await carregar(); return r; }
    catch (e) { setErro(mensagemDeErro(e)); return null; }
  }

  async function adicionarHorario(e) {
    e.preventDefault();
    await executar(() => adm.criarHorario({ ...novo, dia_semana: Number(novo.dia_semana) }), 'Horário de atendimento adicionado.');
  }

  async function adicionarFolga(e) {
    e.preventDefault();
    const r = await executar(() => adm.criarBloqueio({ ...folga, data_fim: folga.data_fim || folga.data_inicio }), 'Folga cadastrada. Nesses dias o site não oferece horários.');
    if (r) {
      setFolga({ data_inicio: '', data_fim: '', motivo: '' });
      if (r.agendamentos_afetados > 0) setAviso(`Atenção: já existem ${r.agendamentos_afetados} agendamento(s) nesse período. Eles não foram cancelados — confira na Agenda e avise os clientes.`);
    }
  }

  if (!horarios) return <p>{erro || 'Carregando…'}</p>;

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Horários e folgas</h1>
      <Mensagens erro={erro} ok={ok} />
      {aviso && <p className="aviso" role="alert">{aviso}</p>}

      <section className="cartao" aria-labelledby="t-h">
        <h2 id="t-h" className="subtitulo">Horários de atendimento</h2>
        <p className="muted">Períodos em que você atende em cada dia da semana. Para pausa de almoço, cadastre dois períodos no mesmo dia (ex.: 09:00–12:00 e 14:00–18:00).</p>

        <ul className="semana-config">
          {ORDEM.map((dia) => {
            const doDia = horarios.filter((h) => h.dia_semana === dia);
            return (
              <li key={dia} className="semana-config__dia">
                <strong>{DIAS_SEMANA[dia]}</strong>
                {doDia.length === 0 && <span className="muted">Sem atendimento</span>}
                <span className="chips">
                  {doDia.map((h) => (
                    <span key={h.id_horario} className="chip">
                      {h.hora_inicio} às {h.hora_fim}
                      <button type="button" className="chip__x" aria-label={`Remover ${h.hora_inicio} às ${h.hora_fim} de ${DIAS_SEMANA[dia]}`}
                        onClick={() => executar(() => adm.excluirHorario(h.id_horario), 'Horário removido.')}>×</button>
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>

        <form className="formulario formulario--linha" onSubmit={adicionarHorario} aria-label="Adicionar horário de atendimento">
          <div className="campo campo--inline">
            <label htmlFor="h-dia">Dia</label>
            <select id="h-dia" value={novo.dia_semana} onChange={(e) => setNovo({ ...novo, dia_semana: e.target.value })}>
              {ORDEM.map((d) => <option key={d} value={d}>{DIAS_SEMANA[d]}</option>)}
            </select>
          </div>
          <div className="campo campo--inline">
            <label htmlFor="h-ini">Início</label>
            <input id="h-ini" type="time" required value={novo.hora_inicio} onChange={(e) => setNovo({ ...novo, hora_inicio: e.target.value })} />
          </div>
          <div className="campo campo--inline">
            <label htmlFor="h-fim">Fim</label>
            <input id="h-fim" type="time" required value={novo.hora_fim} onChange={(e) => setNovo({ ...novo, hora_fim: e.target.value })} />
          </div>
          <button type="submit" className="btn btn--primario">Adicionar</button>
        </form>
      </section>

      <section className="cartao" aria-labelledby="t-f">
        <h2 id="t-f" className="subtitulo">Folgas, feriados e férias</h2>
        <p className="muted">Nos dias cadastrados o site não oferece horários. Agendamentos já marcados não são cancelados automaticamente.</p>

        <form className="formulario formulario--linha" onSubmit={adicionarFolga} aria-label="Adicionar folga">
          <div className="campo campo--inline">
            <label htmlFor="f-ini">De</label>
            <input id="f-ini" type="date" required min={hojeSP()} value={folga.data_inicio} onChange={(e) => setFolga({ ...folga, data_inicio: e.target.value })} />
          </div>
          <div className="campo campo--inline">
            <label htmlFor="f-fim">Até <span className="muted">(opcional)</span></label>
            <input id="f-fim" type="date" min={folga.data_inicio || hojeSP()} value={folga.data_fim} onChange={(e) => setFolga({ ...folga, data_fim: e.target.value })} />
          </div>
          <div className="campo campo--inline campo--cresce">
            <label htmlFor="f-motivo">Motivo <span className="muted">(opcional)</span></label>
            <input id="f-motivo" maxLength={255} value={folga.motivo} onChange={(e) => setFolga({ ...folga, motivo: e.target.value })} placeholder="Ex.: Feriado, férias" />
          </div>
          <button type="submit" className="btn btn--primario">Adicionar</button>
        </form>

        {bloqueios.length === 0 && <p className="muted">Nenhuma folga futura cadastrada.</p>}
        <ul className="lista-simples">
          {bloqueios.map((b) => (
            <li key={b.id_bloqueio} className="linha-acao">
              <span>
                <strong>{b.data_inicio === b.data_fim ? dataCurta(b.data_inicio) : `${dataCurta(b.data_inicio)} a ${dataCurta(b.data_fim)}`}</strong>
                {b.motivo && <span className="muted"> — {b.motivo}</span>}
              </span>
              <BotaoConfirmar rotulo="Remover" pergunta="Remover esta folga?" onConfirmar={() => executar(() => adm.excluirBloqueio(b.id_bloqueio), 'Folga removida.')} />
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
