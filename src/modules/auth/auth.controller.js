import { registerUser, loginUser } from './auth.service.js';

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }

  try {
    const user = await registerUser({ name, email, password });
    return res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  try {
    const result = await loginUser({ email, password });
    if (!result) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}