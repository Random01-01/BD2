import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { dataExtenso, duracao, hojeSP, mascararTelefone, moeda, somarDias } from '../utils.js';

const ETAPAS = ['Serviço', 'Data e horário', 'Seus dados'];

export default function Agendar() {
  const { sessao, ehCliente, sair } = useAuth();
  const [params] = useSearchParams();
  const [etapa, setEtapa] = useState(0);
  const [servicos, setServicos] = useState(null);
  const [erroCarga, setErroCarga] = useState('');
  const [servico, setServico] = useState(null);
  const [data, setData] = useState('');
  const [horarios, setHorarios] = useState(null); // null = ainda não consultou
  const [motivoSemHorario, setMotivoSemHorario] = useState('');
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [hora, setHora] = useState('');
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', observacao: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(null);
  const titulo = useRef(null);

  const hoje = hojeSP();
  const limite = somarDias(hoje, 90);

  useEffect(() => {
    api.servicos().then((lista) => {
      setServicos(lista);
      const pre = lista.find((x) => x.id_servico === Number.parseInt(params.get('servico'), 10)); // veio da página inicial
      if (pre) { setServico(pre); setEtapa(1); }
    }).catch((e) => setErroCarga(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { titulo.current?.focus(); }, [etapa, confirmado]);

  // Consulta horários quando muda serviço ou data
  useEffect(() => {
    if (!servico || !data) return undefined;
    let ativo = true;
    setCarregandoHorarios(true); setHorarios(null); setHora(''); setErro('');
    api.disponibilidade(servico.id_servico, data)
      .then((r) => { if (ativo) { setHorarios(r.horarios); setMotivoSemHorario(r.motivoIndisponivel || ''); } })
      .catch((e) => { if (ativo) setErro(e.message); })
      .finally(() => { if (ativo) setCarregandoHorarios(false); });
    return () => { ativo = false; };
  }, [servico, data]);

  const porCategoria = useMemo(() => {
    const grupos = new Map();
    (servicos || []).forEach((s) => {
      const k = s.categoria || 'Outros';
      grupos.set(k, [...(grupos.get(k) || []), s]);
    });
    return [...grupos.entries()];
  }, [servicos]);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: campo === 'telefone' ? mascararTelefone(e.target.value) : e.target.value }));

  async function confirmar(e) {
    e.preventDefault();
    setErro(''); setEnviando(true);
    try {
      const r = await api.agendar({
        id_servico: servico.id_servico, data, hora_inicio: hora,
        ...(ehCliente ? {} : { cliente: { nome: form.nome, telefone: form.telefone, email: form.email } }),
        observacao: form.observacao || undefined,
      }, ehCliente ? sessao.token : undefined);
      setConfirmado(r);
    } catch (err) {
      if (err.status === 401 && ehCliente) { sair(); setErro('Sua sessão expirou. Entre novamente ou continue sem conta.'); return; }
      setErro(err.detalhes?.length ? `${err.message} ${err.detalhes.join('; ')}.` : err.message);
      if (err.status === 409) { setEtapa(1); setData((d) => d); api.disponibilidade(servico.id_servico, data).then((r2) => { setHorarios(r2.horarios); setHora(''); }); }
    } finally { setEnviando(false); }
  }

  function reiniciar() {
    setConfirmado(null); setEtapa(0); setServico(null); setData(''); setHorarios(null); setHora('');
    setForm({ nome: '', telefone: '', email: '', observacao: '' }); setErro('');
  }

  // ---------- Tela de confirmação ----------
  if (confirmado) {
    const pendente = confirmado.status === 'PENDENTE';
    return (
      <section className="cartao" aria-labelledby="t-ok">
        <h1 id="t-ok" ref={titulo} tabIndex={-1} className="titulo">
          {pendente ? 'Solicitação enviada!' : 'Agendamento confirmado!'} <span aria-hidden="true">🎉</span>
        </h1>
        {pendente && <p className="aviso">A profissional vai confirmar seu horário em breve.</p>}
        <dl className="resumo">
          <div><dt>Serviço</dt><dd>{servico.nome}</dd></div>
          <div><dt>Data</dt><dd>{dataExtenso(confirmado.data_agendamento)}</dd></div>
          <div><dt>Horário</dt><dd>{confirmado.hora_inicio} às {confirmado.hora_fim}</dd></div>
          <div><dt>Valor</dt><dd>{moeda(confirmado.preco_cobrado)}</dd></div>
          <div><dt>Nº do agendamento</dt><dd><strong>#{confirmado.id_agendamento}</strong></dd></div>
        </dl>
        {ehCliente
          ? <p>Acompanhe e cancele quando quiser em <Link to="/minha-conta">Minha conta</Link>.</p>
          : <p>Guarde o número <strong>#{confirmado.id_agendamento}</strong> e o telefone usado: você vai precisar deles se quiser <Link to="/cancelar">cancelar</Link>. Quer evitar isso nas próximas vezes? <Link to="/cadastro">Crie uma conta</Link>.</p>}
        <div className="acoes">
          <Link className="btn" to="/">Voltar ao início</Link>
          <button type="button" className="btn btn--primario" onClick={reiniciar}>Fazer outro agendamento</button>
        </div>
      </section>
    );
  }

  return (
    <section className="cartao" aria-labelledby="t-etapa">
      <ol className="etapas" aria-label="Progresso do agendamento">
        {ETAPAS.map((nome, i) => (
          <li key={nome} className={i === etapa ? 'etapas__item etapas__item--atual' : i < etapa ? 'etapas__item etapas__item--ok' : 'etapas__item'} aria-current={i === etapa ? 'step' : undefined}>
            <span className="etapas__num" aria-hidden="true">{i < etapa ? '✓' : i + 1}</span>
            <span className="etapas__nome">{nome}</span>
          </li>
        ))}
      </ol>

      <div role="alert" aria-live="assertive">{erro && <p className="erro">{erro}</p>}</div>

      {etapa === 0 && (
        <>
          <h1 id="t-etapa" ref={titulo} tabIndex={-1} className="titulo">Qual serviço você deseja?</h1>
          {erroCarga && <p className="erro" role="alert">{erroCarga}</p>}
          {!servicos && !erroCarga && <p aria-live="polite">Carregando serviços…</p>}
          {porCategoria.map(([cat, itens]) => (
            <fieldset key={cat} className="grupo">
              <legend>{cat}</legend>
              <div className="opcoes">
                {itens.map((s) => (
                  <label key={s.id_servico} className={`opcao ${servico?.id_servico === s.id_servico ? 'opcao--marcada' : ''}`}>
                    <input type="radio" name="servico" value={s.id_servico} checked={servico?.id_servico === s.id_servico}
                      onChange={() => { setServico(s); setHorarios(null); setHora(''); }} />
                    <span className="opcao__nome">{s.nome}</span>
                    {s.descricao && <span className="opcao__desc">{s.descricao}</span>}
                    <span className="opcao__meta">{moeda(s.preco)} · {duracao(s.duracao_minutos)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="acoes">
            <button type="button" className="btn btn--primario" disabled={!servico} onClick={() => setEtapa(1)}>Continuar</button>
          </div>
        </>
      )}

      {etapa === 1 && (
        <>
          <h1 id="t-etapa" ref={titulo} tabIndex={-1} className="titulo">Escolha o dia e o horário</h1>
          <p className="muted">{servico.nome} · {moeda(servico.preco)} · {duracao(servico.duracao_minutos)}</p>
          <div className="campo">
            <label htmlFor="data">Data</label>
            <input id="data" type="date" min={hoje} max={limite} value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          {data && <p className="muted">{dataExtenso(data)}</p>}

          <div aria-live="polite">
            {carregandoHorarios && <p>Buscando horários…</p>}
            {horarios && horarios.length === 0 && <p className="aviso">Sem horários neste dia{motivoSemHorario ? ` (${motivoSemHorario.replace(/\.$/, '')})` : ''}. Tente outra data.</p>}
          </div>
          {horarios && horarios.length > 0 && (
            <fieldset className="grupo">
              <legend>Horários disponíveis</legend>
              <div className="horarios">
                {horarios.map((h) => (
                  <label key={h} className={`horario ${hora === h ? 'horario--marcado' : ''}`}>
                    <input type="radio" name="hora" value={h} checked={hora === h} onChange={() => setHora(h)} />
                    {h}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="acoes">
            <button type="button" className="btn" onClick={() => setEtapa(0)}>Voltar</button>
            <button type="button" className="btn btn--primario" disabled={!hora} onClick={() => setEtapa(2)}>Continuar</button>
          </div>
        </>
      )}

      {etapa === 2 && (
        <form onSubmit={confirmar} noValidate={false}>
          <h1 id="t-etapa" ref={titulo} tabIndex={-1} className="titulo">{ehCliente ? 'Confirme seu agendamento' : 'Seus dados'}</h1>
          <p className="resumo-linha">
            <strong>{servico.nome}</strong> · {dataExtenso(data)} às <strong>{hora}</strong> · {moeda(servico.preco)}
          </p>
          {ehCliente
            ? <p className="muted">Agendando como <strong>{sessao.usuario.nome}</strong>{sessao.usuario.telefone ? ` · ${sessao.usuario.telefone}` : ''}.</p>
            : null}
          {!ehCliente && (<>
          <div className="campo">
            <label htmlFor="nome">Nome completo</label>
            <input id="nome" required minLength={2} maxLength={100} autoComplete="name" value={form.nome} onChange={set('nome')} />
          </div>
          <div className="campo">
            <label htmlFor="tel">Telefone (WhatsApp)</label>
            <input id="tel" required inputMode="tel" autoComplete="tel" placeholder="(18) 99999-9999" pattern="\(\d{2}\) \d{4,5}-\d{4}"
              title="Informe com DDD, ex.: (18) 99999-9999" value={form.telefone} onChange={set('telefone')} aria-describedby="tel-ajuda" />
            <small id="tel-ajuda">Usamos o telefone para identificar o seu agendamento.</small>
          </div>
          <div className="campo">
            <label htmlFor="email">E-mail <span className="muted">(opcional)</span></label>
            <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
          </div>
          </>)}
          <div className="campo">
            <label htmlFor="obs">Observação <span className="muted">(opcional)</span></label>
            <textarea id="obs" rows={3} maxLength={500} value={form.observacao} onChange={set('observacao')} />
          </div>
          <div className="acoes">
            <button type="button" className="btn" onClick={() => setEtapa(1)}>Voltar</button>
            <button type="submit" className="btn btn--primario" disabled={enviando}>{enviando ? 'Confirmando…' : 'Confirmar agendamento'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
