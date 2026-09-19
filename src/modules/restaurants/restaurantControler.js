import { findAllRestaurants, createRestaurant } from './restaurantService.js';

export async function getRestaurants(req, res) {
    try {
        const restaurants = await findAllRestaurants();
        return res.json(restaurants);
    } catch (error) {
        console.error("Erro ao buscar restaurantes:", error.message);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
}

export async function postRestaurant(req, res) {
    const { name, category } = req.body;
    
    if (!name || !category) {
        return res.status(400).json({ erro: "Nome e categoria são obrigatórios" });
    }

    try {
        const novoRestaurante = await createRestaurant(req.body);
        return res.status(201).json(novoRestaurante);
    } catch (error) {
        console.error("Erro ao cadastrar restaurante:", error.message);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
}