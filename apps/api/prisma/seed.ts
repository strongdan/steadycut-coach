import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: "Chia protein pudding",
      mealType: "breakfast",
      proteinEstimate: 35,
      fiberEstimate: 14,
      ingredientsJson: ["chia seeds", "protein powder", "berries", "unsweetened milk"],
      prepInstructions: "Mix the night before. Add berries at serving time.",
    },
    {
      name: "Egg whites with spinach, beans, salsa",
      mealType: "breakfast",
      proteinEstimate: 32,
      fiberEstimate: 10,
      ingredientsJson: ["egg whites", "spinach", "black beans", "salsa"],
      prepInstructions: "Cook spinach and egg whites, then add beans and salsa.",
    },
    {
      name: "Sardines with hummus and salad",
      mealType: "lunch",
      proteinEstimate: 34,
      fiberEstimate: 11,
      ingredientsJson: ["sardines", "hummus", "olive oil", "salad vegetables"],
      prepInstructions: "Build the salad first, then add sardines and hummus.",
    },
    {
      name: "Chili lunch",
      mealType: "lunch",
      proteinEstimate: 40,
      fiberEstimate: 12,
      ingredientsJson: ["lean ground meat", "beans", "tomatoes", "vegetables"],
      prepInstructions: "Batch cook. Reheat and pair with extra vegetables.",
    },
    {
      name: "Taco bowl",
      mealType: "lunch",
      proteinEstimate: 42,
      fiberEstimate: 12,
      ingredientsJson: ["lean protein", "beans", "salsa", "lettuce", "rice optional"],
      prepInstructions: "Keep the bowl protein-forward and add beans before starch.",
    },
    {
      name: "Protein/fiber smoothie",
      mealType: "snack",
      proteinEstimate: 35,
      fiberEstimate: 10,
      ingredientsJson: ["protein powder", "berries", "chia", "spinach", "water"],
      prepInstructions: "Blend until thick enough to slow the eating pace.",
    },
    {
      name: "Broth evening wind-down option",
      mealType: "snack",
      proteinEstimate: 0,
      fiberEstimate: 0,
      ingredientsJson: ["broth", "tea", "salt optional"],
      prepInstructions: "Use this as a non-caloric cutoff ritual unless the user configures a caloric exception.",
    },
  ];

  for (const template of templates) {
    await prisma.mealTemplate.upsert({
      where: {
        id: `system-${template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      },
      update: {
        ...template,
        isDefault: true,
        isActive: true,
      },
      create: {
        id: `system-${template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        ...template,
        isDefault: true,
        isActive: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
