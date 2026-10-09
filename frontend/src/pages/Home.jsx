import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Desenho, FundoDesenhos } from '../desenhos.jsx';
import { marca } from '../marca.js';
import { duracao, moeda } from '../utils.js';

const TONS = ['rosa', 'verde', 'azul', 'areia'];

export default function Home() {
  const navegar = useNavigate();
  const [servicos, setServicos] = useState(null);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('Todos');

  useEffect(() => { api.servicos().then(setServicos).catch((e) => setErro(e.message)); }, []);

  const categorias = useMemo(() => [...new Set((servicos || []).map((s) => s.categoria || 'Outros'))], [servicos]);
  const visiveis = (servicos || []).filter((s) => filtro === 'Todos' || (s.categoria || 'Outros') === filtro);
  const tomDe = (s) => TONS[Math.max(0, categorias.indexOf(s.categoria || 'Outros')) % TONS.length];
  const { contato } = marca;

  return (
    <>
      <section className="hero" aria-labelledby="t-hero">
      <FundoDesenhos variante="hero" itens={['tesoura', 'secador', 'espelho', 'pente', 'esmalte', 'brilho', 'brilho']} />
        <div className="faixa__interno hero__grade">
          <div>
            <p className="hero__eyebrow">{marca.nome} · {marca.slogan}</p>
            <h1 id="t-hero" className="hero__titulo">{marca.titulo}</h1>
            <p className="hero__texto">{marca.subtitulo}</p>
            <div className="acoes acoes--linha">
              <a className="btn btn--primario btn--grande" href="#servicos">Agendar horário</a>
              <a className="btn btn--grande" href="#como-funciona">Como funciona</a>
            </div>
            <p className="hero__selo"><span aria-hidden="true">✦</span> <strong>Agende online</strong> <span className="muted">· sem ligar, sem espera</span></p>
          </div>
          <div className="hero__arte" aria-hidden="true">
            {marca.imagemHero
              ? (
                <>
                  <span className="hero__moldura" />
                  <img src={marca.imagemHero} alt="" className="hero__foto" />
                </>
              )
              : (
                <>
                  <span className="forma forma--rosa" /><span className="forma forma--verde" />
                  <span className="forma forma--azul" /><span className="forma forma--areia" />
                  <span className="hero__letra">{marca.nome.charAt(0)}</span>
                </>
              )}
          </div>
        </div>
      </section>

      <section id="servicos" className="faixa" aria-labelledby="t-serv" tabIndex={-1}>
        <div className="faixa__interno">
          <h2 id="t-serv" className="faixa__titulo">Nossos serviços</h2>
          <p className="muted">Escolha um serviço e clique em <strong>Agendar</strong>.</p>

          {categorias.length > 1 && (
            <div className="chips-filtro" role="group" aria-label="Filtrar por categoria">
              {['Todos', ...categorias].map((c) => (
                <button key={c} type="button" className={filtro === c ? 'filtro filtro--on' : 'filtro'} aria-pressed={filtro === c} onClick={() => setFiltro(c)}>{c}</button>
              ))}
            </div>
          )}

          {erro && <p className="erro" role="alert">{erro}</p>}
          {!servicos && !erro && <p aria-live="polite">Carregando serviços…</p>}
          {servicos && servicos.length === 0 && <p className="aviso">Nenhum serviço disponível no momento.</p>}

          <ul className="vitrine">
            {visiveis.map((s) => (
              <li key={s.id_servico} className={`servico servico--${tomDe(s)}`}>
                <div className="servico__img">
                  <img src={marca.imagensServico?.[s.nome] ?? marca.imagensCategoria?.[s.categoria] ?? marca.imagemPadrao} alt="" loading="lazy" />
                </div>
                <div className="servico__corpo">
                  <p className="servico__cat">{s.categoria || 'Outros'}</p>
                  <h3 className="servico__nome">{s.nome}</h3>
                  {s.descricao && <p className="servico__desc">{s.descricao}</p>}
                  <p className="servico__meta"><strong>{moeda(s.preco)}</strong> · {duracao(s.duracao_minutos)}</p>
                  <button type="button" className="btn btn--primario" aria-label={`Agendar ${s.nome}`}
                    onClick={() => navegar(`/agendar/identificar?servico=${s.id_servico}`)}>Agendar</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="como-funciona" className="faixa faixa--escura" aria-labelledby="t-como" tabIndex={-1}>
        <FundoDesenhos variante="escuro" itens={['escova', 'tesoura', 'secador', 'esmalte', 'brilho', 'brilho']} />
        <div className="faixa__interno">
          <p className="faixa__sobre">Simples assim</p>
          <h2 id="t-como" className="faixa__titulo">Como funciona</h2>
          <ol className="passos">
            {marca.passos.map((p, i) => (
              <li key={p.titulo} className="passo">
                <span className="passo__numero" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="passo__icone"><Desenho nome={p.icone ?? 'brilho'} /></span>
                <h3>{p.titulo}</h3>
                <p className="muted">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="contato" className="faixa faixa--areia" aria-labelledby="t-contato" tabIndex={-1}>
        <FundoDesenhos variante="claro" itens={['espelho', 'pente', 'brilho']} />
        <div className="faixa__interno">
          <h2 id="t-contato" className="faixa__titulo">Onde e quando</h2>
          <dl className="contato">
            <div><dt>Endereço</dt><dd>{contato.endereco}<br />{contato.cidade}</dd></div>
            <div><dt>Atendimento</dt><dd>{contato.horario}</dd></div>
            <div><dt>WhatsApp</dt><dd>{contato.whatsapp}</dd></div>
            <div><dt>Instagram</dt><dd>{contato.instagram}</dd></div>
          </dl>
          <p className="muted">Precisa cancelar sem ter conta? <Link to="/cancelar">Cancele aqui</Link>.</p>
        </div>
      </section>
    </>
  );
}
