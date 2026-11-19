const jwt = require('jsonwebtoken');
const { ErroApi } = require('./erros');

// Exige "Authorization: Bearer <token>" e expõe o Usuário atual em req.usuario.
function exigirToken({ db, jwtSecret }) {
  return (req, res, next) => {
    const naoAutenticado = new ErroApi(401, 'NAO_AUTENTICADO', 'Você precisa estar autenticado.');
    const [tipo, token] = (req.headers.authorization || '').split(' ');
    if (tipo !== 'Bearer' || !token) return next(naoAutenticado);
    try {
      const { sub } = jwt.verify(token, jwtSecret);
      const usuario = db.prepare('SELECT id, nome FROM usuarios WHERE id = ?').get(sub);
      if (!usuario) return next(naoAutenticado);
      req.usuario = { id: usuario.id, nome: usuario.nome };
      next();
    } catch {
      next(naoAutenticado);
    }
  };
}

module.exports = { exigirToken };
