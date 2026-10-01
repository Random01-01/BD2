import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { mascararTelefone } from '../utils.js';

export default function CancelarAgendamento() {
  const [id, setId] = useState('');
  const [telefone, setTelefone] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro(''); setEnviando(true);
    try { await api.cancelar(id.replace(/\D/g, ''), telefone, motivo); setOk(true); }
    catch (err) { setErro(err.message); }
    finally { setEnviando(false); }
  }

  if (ok) {
    return (
      <section className="cartao">
        <h1 className="titulo">Agendamento cancelado</h1>
        <p>Pronto! O horário foi liberado. Quando quiser, é só marcar um novo.</p>
        <div className="acoes"><Link className="btn btn--primario" to="/">Novo agendamento</Link></div>
      </section>
    );
  }

  return (
    <section className="cartao" aria-labelledby="t">
      <h1 id="t" className="titulo">Cancelar um horário</h1>
      <p className="muted">Informe o número do agendamento e o telefone usado na reserva.</p>
      <div role="alert" aria-live="assertive">{erro && <p className="erro">{erro}</p>}</div>
      <form onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="id">Nº do agendamento</label>
          <input id="id" required inputMode="numeric" placeholder="Ex.: 12" value={id} onChange={(e) => setId(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="tel">Telefone</label>
          <input id="tel" required inputMode="tel" autoComplete="tel" placeholder="(18) 99999-9999" value={telefone} onChange={(e) => setTelefone(mascararTelefone(e.target.value))} />
        </div>
        <div className="campo">
          <label htmlFor="motivo">Motivo <span className="muted">(opcional)</span></label>
          <input id="motivo" maxLength={255} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <div className="acoes">
          <Link className="btn" to="/">Voltar</Link>
          <button type="submit" className="btn btn--perigo" disabled={enviando}>{enviando ? 'Cancelando…' : 'Cancelar agendamento'}</button>
        </div>
      </form>
    </section>
  );
}
