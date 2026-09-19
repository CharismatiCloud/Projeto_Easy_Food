import { Router } from 'express';
import { register, login } from './auth.controller.js';
import { verifyJWT } from '../../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

router.get('/me', verifyJWT, (req, res) => {
  res.json({ message: 'Você está autenticado!', user: req.user });
});

export default router;