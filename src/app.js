import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './modules/auth/auth.routes.js';
import restaurantRoutes from './modules/restaurants/restaurantRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use('/auth', authRoutes);
app.use(restaurantRoutes);

export default app;