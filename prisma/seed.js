const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.restaurant.createMany({
    data: [
      { name: "Pizzaria Napoli", category: "Pizza", rating: 4.5 },
      { name: "Burger House", category: "Burger", rating: 4.2 },
      { name: "Sushi Express", category: "Japonesa", rating: 4.8 }
    ]
  });
  console.log("Dados inseridos com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());