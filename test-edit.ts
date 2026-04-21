import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

function crDate(s: string): Date { return new Date(`${s}T00:00:00Z`); }

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  // Create an event
  const e = await prisma.event.create({
    data: {
      title: "TEST EDIT",
      date: crDate("2026-04-25"),
      kind: "GENERAL",
      recurrence: "NONE",
      createdById: admin!.id,
    },
  });
  console.log("Created @ 4-25, stored:", e.date.toISOString());

  // Update to different date
  const updated = await prisma.event.update({
    where: { id: e.id },
    data: { date: crDate("2026-05-15") },
  });
  console.log("Updated @ 5-15, stored:", updated.date.toISOString());

  // Re-read
  const reread = await prisma.event.findUnique({ where: { id: e.id } });
  console.log("Re-read:", reread!.date.toISOString());

  await prisma.event.delete({ where: { id: e.id } });
  process.exit(0);
})();
