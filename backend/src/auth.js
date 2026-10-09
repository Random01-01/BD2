import jwt from 'jsonwebtoken';

// "tipo" separa os dois mundos: token de profissional (admin) nunca vale como de cliente e vice-versa.
export function assinarToken(usuario, segredo) {
  return jwt.sign(
    { tipo: 'admin', sub: usuario.id_usuario, id_profissional: usuario.id_profissional, perfil: usuario.perfil },
    segredo,
    { expiresIn: '8h' },
  );
}

export function assinarTokenCliente(conta, segredo) {
  return jwt.sign({ tipo: 'cliente', sub: conta.id_conta, id_cliente: conta.id_cliente }, segredo, { expiresIn: '7d' });
}

const lerBearer = (req) => {
  const cabecalho = req.headers.authorization || '';
  return cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
};

/** Exige token válido do tipo informado ('admin' ou 'cliente'). Tokens antigos sem "tipo" valem como admin. */
export function exigirLogin(segredo, tipo = 'admin') {
  return (req, res, next) => {
    const token = lerBearer(req);
    if (!token) return res.status(401).json({ erro: 'Login necessário.' });
    try {
      const dados = jwt.verify(token, segredo);
      if ((dados.tipo ?? 'admin') !== tipo) return res.status(403).json({ erro: 'Acesso não permitido para este tipo de conta.' });
      req.usuario = dados;
      next();
    } catch {
      res.status(401).json({ erro: 'Sessão inválida ou expirada.' });
    }
  };
}

/** Token de cliente opcional: devolve os dados, null (sem token) ou lança erro se o token for inválido. */
export function clienteOpcional(segredo) {
  return (req, res, next) => {
    const token = lerBearer(req);
    if (!token) return next();
    try {
      const dados = jwt.verify(token, segredo);
      if (dados.tipo === 'cliente') req.cliente = dados;
      next();
    } catch {
      res.status(401).json({ erro: 'Sessão expirada. Entre novamente ou continue sem conta.' });
    }
  };
}
