import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { BotaoConfirmar, Mensagens, mensagemDeErro } from '../../components.jsx';
import { duracao, moeda } from '../../utils.js';

const VAZIO = { nome: '', descricao: '', preco: '', duracao_minutos: 60, id_categoria: '', ativo: true };

export default function Servicos() {
  const { sessao } = useAuth();
  const adm = api.admin(sessao.token);
  const [aba, setAba] = useState('servicos');
  const [servicos, setServicos] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const carregar = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api.admin(sessao.token).servicos(), api.admin(sessao.token).categorias()]);
      setServicos(s); setCategorias(c);
    } catch (e) { setErro(e.message); }
  }, [sessao.token]);

  useEffect(() => { carregar(); }, [carregar]);

  async function executar(acao, msg) {
    setErro(''); setOk('');
    try { await acao(); setOk(msg); await carregar(); return true; }
    catch (e) { setErro(mensagemDeErro(e)); return false; }
  }

  return (
    <section aria-labelledby="t">
      <h1 id="t" className="titulo">Serviços</h1>
      <div className="segmentado" role="group" aria-label="Seção">
        <button type="button" className={aba === 'servicos' ? 'segmentado__on' : ''} aria-pressed={aba === 'servicos'} onClick={() => setAba('servicos')}>Serviços</button>
        <button type="button" className={aba === 'categorias' ? 'segmentado__on' : ''} aria-pressed={aba === 'categorias'} onClick={() => setAba('categorias')}>Categorias</button>
      </div>
      <Mensagens erro={erro} ok={ok} />
      {aba === 'servicos'
        ? <ListaServicos servicos={servicos} categorias={categorias} adm={adm} executar={executar} />
        : <ListaCategorias categorias={categorias} adm={adm} executar={executar} />}
    </section>
  );
}

function ListaServicos({ servicos, categorias, adm, executar }) {
  const [editando, setEditando] = useState(null); // null | 'novo' | id
  const [form, setForm] = useState(VAZIO);

  const abrir = (s) => {
    setEditando(s ? s.id_servico : 'novo');
    setForm(s ? { nome: s.nome, descricao: s.descricao || '', preco: s.preco, duracao_minutos: s.duracao_minutos, id_categoria: s.id_categoria ?? '', ativo: s.ativo } : VAZIO);
  };
  const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function salvar(e) {
    e.preventDefault();
    const dados = { ...form, preco: Number(String(form.preco).replace(',', '.')), duracao_minutos: Number(form.duracao_minutos), id_categoria: form.id_categoria === '' ? null : Number(form.id_categoria) };
    const id = editando === 'novo' ? undefined : editando;
    if (await executar(() => adm.salvarServico(dados, id), id ? 'Serviço atualizado.' : 'Serviço criado.')) setEditando(null);
  }

  if (!servicos) return <p>Carregando…</p>;

  return (
    <>
      {editando === null && <div className="acoes acoes--linha"><button type="button" className="btn btn--primario" onClick={() => abrir(null)}>+ Novo serviço</button></div>}

      {editando !== null && (
        <form className="cartao formulario" onSubmit={salvar} aria-label={editando === 'novo' ? 'Novo serviço' : 'Editar serviço'}>
          <h2 className="subtitulo">{editando === 'novo' ? 'Novo serviço' : 'Editar serviço'}</h2>
          <div className="campo">
            <label htmlFor="s-nome">Nome</label>
            <input id="s-nome" required minLength={2} maxLength={100} value={form.nome} onChange={campo('nome')} autoFocus />
          </div>
          <div className="campo">
            <label htmlFor="s-desc">Descrição <span className="muted">(opcional)</span></label>
            <textarea id="s-desc" rows={2} maxLength={1000} value={form.descricao} onChange={campo('descricao')} />
          </div>
          <div className="grade-campos">
            <div className="campo">
              <label htmlFor="s-preco">Preço (R$)</label>
              <input id="s-preco" type="number" required min="0" max="99999.99" step="0.01" inputMode="decimal" value={form.preco} onChange={campo('preco')} />
            </div>
            <div className="campo">
              <label htmlFor="s-dur">Duração (minutos)</label>
              <input id="s-dur" type="number" required min="5" max="600" step="5" value={form.duracao_minutos} onChange={campo('duracao_minutos')} />
            </div>
            <div className="campo">
              <label htmlFor="s-cat">Categoria</label>
              <select id="s-cat" value={form.id_categoria} onChange={campo('id_categoria')}>
                <option value="">Sem categoria</option>
                {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nome}</option>)}
              </select>
            </div>
          </div>
          <label className="check"><input type="checkbox" checked={form.ativo} onChange={campo('ativo')} /> Disponível para agendamento no site</label>
          <div className="acoes">
            <button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className="btn btn--primario">Salvar</button>
          </div>
        </form>
      )}

      {servicos.length === 0 && <p className="aviso">Nenhum serviço cadastrado ainda.</p>}
      <ul className="lista">
        {servicos.map((s) => (
          <li key={s.id_servico} className={`cartao item ${s.ativo ? '' : 'item--inativo'}`}>
            <div className="item__corpo">
              <p className="item__nome">{s.nome} {!s.ativo && <span className="selo selo--cancelado">Inativo</span>}</p>
              <p className="muted">{s.categoria || 'Sem categoria'} · {moeda(s.preco)} · {duracao(s.duracao_minutos)}</p>
              {s.descricao && <p className="muted">{s.descricao}</p>}
            </div>
            <div className="acoes acoes--linha item__acoes">
              <button type="button" className="btn" onClick={() => abrir(s)} aria-label={`Editar ${s.nome}`}>Editar</button>
              <button type="button" className="btn" onClick={() => executar(() => adm.salvarServico({ ...s, ativo: !s.ativo }, s.id_servico), s.ativo ? 'Serviço desativado.' : 'Serviço ativado.')}
                aria-label={`${s.ativo ? 'Desativar' : 'Ativar'} ${s.nome}`}>{s.ativo ? 'Desativar' : 'Ativar'}</button>
              <BotaoConfirmar rotulo="Excluir" pergunta={`Excluir "${s.nome}"?`} onConfirmar={() => executar(() => adm.excluirServico(s.id_servico), 'Serviço excluído.')} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ListaCategorias({ categorias, adm, executar }) {
  const [nome, setNome] = useState('');
  const [editando, setEditando] = useState(null);
  const [nomeEdicao, setNomeEdicao] = useState('');

  return (
    <>
      <form className="cartao formulario formulario--linha" onSubmit={async (e) => { e.preventDefault(); if (await executar(() => adm.salvarCategoria(nome), 'Categoria criada.')) setNome(''); }}>
        <div className="campo campo--inline">
          <label htmlFor="c-nome">Nova categoria</label>
          <input id="c-nome" required minLength={2} maxLength={50} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maquiagem" />
        </div>
        <button type="submit" className="btn btn--primario">Adicionar</button>
      </form>

      <ul className="lista">
        {categorias.map((c) => (
          <li key={c.id_categoria} className="cartao item">
            {editando === c.id_categoria ? (
              <form className="formulario--linha" onSubmit={async (e) => { e.preventDefault(); if (await executar(() => adm.salvarCategoria(nomeEdicao, c.id_categoria), 'Categoria renomeada.')) setEditando(null); }}>
                <div className="campo campo--inline">
                  <label htmlFor={`c${c.id_categoria}`} className="sr-only">Nome da categoria</label>
                  <input id={`c${c.id_categoria}`} required minLength={2} maxLength={50} value={nomeEdicao} onChange={(e) => setNomeEdicao(e.target.value)} autoFocus />
                </div>
                <button type="submit" className="btn btn--primario">Salvar</button>
                <button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
              </form>
            ) : (
              <>
                <div className="item__corpo">
                  <p className="item__nome">{c.nome}</p>
                  <p className="muted">{c.qtd_servicos} serviço(s)</p>
                </div>
                <div className="acoes acoes--linha item__acoes">
                  <button type="button" className="btn" onClick={() => { setEditando(c.id_categoria); setNomeEdicao(c.nome); }} aria-label={`Renomear ${c.nome}`}>Renomear</button>
                  <BotaoConfirmar rotulo="Excluir" pergunta={`Excluir "${c.nome}"? Os serviços ficam sem categoria.`} onConfirmar={() => executar(() => adm.excluirCategoria(c.id_categoria), 'Categoria excluída.')} />
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
