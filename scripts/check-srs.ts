import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const [rsTotal, itemsWithGroup, itemsNoGroup, groups, dueNow, attempts, sampleReviews] =
    await Promise.all([
      prisma.reviewState.count(),
      prisma.exerciseItem.count({ where: { groupId: { not: null } } }),
      prisma.exerciseItem.count({ where: { groupId: null } }),
      prisma.paronymGroup.count(),
      prisma.reviewState.count({ where: { nextReview: { lte: new Date() } } }),
      prisma.attempt.count(),
      prisma.reviewState.findMany({ take: 5, orderBy: { nextReview: "asc" } }),
    ]);

  console.log("=== État SRS ===");
  console.log({ rsTotal, itemsWithGroup, itemsNoGroup, groups, dueNow, attempts });
  console.log("\n=== 5 prochaines révisions ===");
  sampleReviews.forEach((r) =>
    console.log(`  userId=${r.userId.slice(0, 12)}… groupId=${r.groupId.slice(0, 8)}… box=${r.box} nextReview=${r.nextReview.toISOString()} due=${r.nextReview <= new Date()}`)
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
