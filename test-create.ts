import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

function crDate(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

(async () => {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) { console.log("no admin"); return; }

  // Simulate the EXACT same path as createEvent uses
  const userPickedDate = "2026-04-25";
  console.log("User picked:", userPickedDate);

  const d = crDate(userPickedDate);
  console.log("crDate produces:", d.toISOString());

  const created = await prisma.event.create({
    data: {
      title: "TEST DELETE ME",
      date: d,
      kind: "GENERAL",
      recurrence: "NONE",
      createdById: admin.id,
    },
  });
  console.log("Prisma returned date:", created.date.toISOString());

  // Re-read from DB
  const reread = await prisma.event.findUnique({ where: { id: created.id } });
  console.log("Re-read date:", reread!.date.toISOString());

  // Check dbDateToKey output
  function dbDateToKey(d: Date) { return d.toISOString().slice(0, 10); }
  console.log("dbDateToKey:", dbDateToKey(reread!.date));

  // Cleanup
  await prisma.event.delete({ where: { id: created.id } });
  process.exit(0);
})();
