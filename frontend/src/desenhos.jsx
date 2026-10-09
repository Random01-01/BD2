// Desenhos de linha fina (estilo "line-art") usados como decoração de fundo.
// Todos são decorativos: aria-hidden, sem foco e sem texto. A cor vem de `currentColor`.
const FORMAS = {
  tesoura: (
    <>
      <path d="M32 66 L78 10" /><path d="M50 68 L14 12" />
      <circle cx="28" cy="78" r="11" /><circle cx="56" cy="80" r="11" />
    </>
  ),
  pente: (
    <>
      <rect x="8" y="26" width="84" height="20" rx="5" />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => <path key={i} d={`M${14 + i * 8} 46 V72`} />)}
    </>
  ),
  secador: (
    <>
      <path d="M22 28 L62 22 Q82 22 82 42 Q82 62 62 62 L22 56 Z" />
      <path d="M44 60 L40 88 Q40 94 46 94 L52 94 Q58 94 58 88 L60 62" />
      <path d="M6 34 H16 M4 42 H16 M6 50 H16" />
    </>
  ),
  espelho: (
    <>
      <circle cx="50" cy="36" r="28" /><circle cx="50" cy="36" r="21" />
      <path d="M45 64 V88 Q45 94 50 94 Q55 94 55 88 V64" />
      <path d="M38 28 Q42 22 49 21" />
    </>
  ),
  esmalte: (
    <>
      <rect x="40" y="6" width="20" height="24" rx="4" /><path d="M44 12 V24 M50 12 V24 M56 12 V24" />
      <rect x="42" y="30" width="16" height="10" /><rect x="30" y="40" width="40" height="50" rx="12" />
      <path d="M40 58 Q50 52 60 58" />
    </>
  ),
  escova: (
    <>
      <ellipse cx="50" cy="32" rx="24" ry="28" />
      {[[40, 20], [50, 18], [60, 20], [36, 32], [46, 30], [56, 30], [64, 32], [42, 42], [52, 42], [60, 42]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" />)}
      <path d="M44 58 L42 90 Q42 95 47 95 L53 95 Q58 95 58 90 L56 58" />
    </>
  ),
  brilho: <path d="M50 10 Q53 47 90 50 Q53 53 50 90 Q47 53 10 50 Q47 47 50 10 Z" />,
  calendario: (
    <>
      <rect x="14" y="20" width="72" height="66" rx="10" /><path d="M14 40 H86 M32 10 V28 M68 10 V28" />
      <path d="M30 56 H38 M46 56 H54 M62 56 H70 M30 70 H38 M46 70 H54" />
    </>
  ),
  check: (
    <>
      <circle cx="50" cy="50" r="38" /><path d="M32 52 L45 65 L69 38" />
    </>
  ),
};

export function Desenho({ nome, className = '', style }) {
  return (
    <svg className={`desenho ${className}`} style={style} viewBox="0 0 100 100" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {FORMAS[nome]}
    </svg>
  );
}

/** Conjunto de ferramentas espalhadas pelo fundo de uma seção (posições definidas no CSS: .fundo--hero etc.). */
export function FundoDesenhos({ variante, itens }) {
  return (
    <div className={`fundo fundo--${variante}`} aria-hidden="true">
      {itens.map((nome, i) => <Desenho key={`${nome}${i}`} nome={nome} className={`d${i + 1}`} />)}
    </div>
  );
}
