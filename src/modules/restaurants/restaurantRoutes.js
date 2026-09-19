import { Router } from 'express';
import { getRestaurants, postRestaurant } from './restaurantControler.js';
import { verifyJWT } from '../../middlewares/authMiddleware.js';

const router = Router();

// Rota pública: Qualquer um pode listar os restaurantes
router.get('/restaurants', getRestaurants);

// Rota protegida: Apenas usuários autenticados (com token JWT válido) podem cadastrar
router.post('/restaurants', verifyJWT, postRestaurant);

export default router;