import prisma from '../../lib/prisma.js';
import { sendEmail, escapeHtml } from '../shared/email.service.js';

export async function findAllRestaurants() {
  return await prisma.restaurant.findMany();
}

export async function createRestaurant(data, user) {
  const { name, category, rating } = data;

  // 1. Operação principal
  const restaurant = await prisma.restaurant.create({
    data: {
      name,
      category,
      rating: rating || 0
    }
  });

  // 2. Ação secundária: boas-vindas ao usuário logado que cadastrou
  try {
    await sendEmail({
      to: user.email,
      toName: restaurant.name,
      subject: `Bem-vindo à EasyFood, ${restaurant.name}!`,
      header: `Olá, ${escapeHtml(restaurant.name)}!`,
      body: `
        Seu restaurante foi cadastrado com sucesso na EasyFood.<br/>
        Categoria: ${escapeHtml(restaurant.category)}.
      `,
      footer: 'Equipe EasyFood'
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error.message);
  }

  // 3. Ação secundária: aviso interno ao comercial (mesma função sendEmail)
  if (process.env.COMMERCIAL_EMAIL) {
    try {
      await sendEmail({
        to: process.env.COMMERCIAL_EMAIL,
        toName: 'Comercial EasyFood',
        subject: `Novo restaurante cadastrado: ${restaurant.name}`,
        header: 'Novo restaurante na plataforma',
        body: `
          Nome: ${escapeHtml(restaurant.name)}<br/>
          Categoria: ${escapeHtml(restaurant.category)}<br/>
          Avaliação: ${restaurant.rating}
        `,
        footer: 'Notificação automática - EasyFood'
      });
    } catch (error) {
      console.error('Erro ao notificar o comercial:', error.message);
    }
  }

  // 4. Retorno da operação principal
  return restaurant;
}