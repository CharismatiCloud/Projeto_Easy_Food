import prisma from '../../lib/prisma.js';

export async function findAllRestaurants() {
  return await prisma.restaurant.findMany();
}

export async function createRestaurant(data) {
  const { name, category, rating } = data;
  
  return await prisma.restaurant.create({
    data: {
      name,
      category,
      rating: rating || 0
    }
  });
}