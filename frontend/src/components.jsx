import { useState } from 'react';

/** Área de avisos acessível (leitores de tela anunciam erros e confirmações). */
export function Mensagens({ erro, ok }) {
  return (
    <>
      <div role="alert" aria-live="assertive">{erro && <p className="erro">{erro}</p>}</div>
      <div role="status" aria-live="polite">{ok && <p className="ok">{ok}</p>}</div>
    </>
  );
}

/** Botão que pede confirmação no próprio lugar antes de executar (sem janela pop-up). */
export function BotaoConfirmar({ rotulo, pergunta, onConfirmar, className = 'btn btn--perigo' }) {
  const [pedindo, setPedindo] = useState(false);
  if (!pedindo) return <button type="button" className="btn" onClick={() => setPedindo(true)}>{rotulo}</button>;
  return (
    <span className="confirmar" role="group" aria-label={pergunta}>
      <span>{pergunta}</span>
      <button type="button" className={className} onClick={() => { setPedindo(false); onConfirmar(); }}>Sim, {rotulo.toLowerCase()}</button>
      <button type="button" className="btn" onClick={() => setPedindo(false)}>Não</button>
    </span>
  );
}

export const mensagemDeErro = (e) => (e.detalhes?.length ? `${e.message} ${e.detalhes.join('; ')}.` : e.message);
