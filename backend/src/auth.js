import jwt from 'jsonwebtoken';

export function assinarToken(usuario, segredo) {
  return jwt.sign(
    { sub: usuario.id_usuario, id_profissional: usuario.id_profissional, perfil: usuario.perfil },
    segredo,
    { expiresIn: '8h' },
  );
}

export function exigirLogin(segredo) {
  return (req, res, next) => {
    const cabecalho = req.headers.authorization || '';
    const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
    if (!token) return res.status(401).json({ erro: 'Login necessário.' });
    try {
      req.usuario = jwt.verify(token, segredo);
      next();
    } catch {
      res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
    }
  };
}
