import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

(async () => {
  const e = await prisma.event.findFirst({ where: { title: { contains: "Kimberley" } } });
  if (!e) { console.log("Not found"); process.exit(1); }
  console.log("Before:", e.title, "date:", e.date.toISOString());

  const d = new Date("2026-02-14T00:00:00-06:00");
  console.log("Writing:", d.toISOString());

  await prisma.event.update({ where: { id: e.id }, data: { date: d } });
  const reread = await prisma.event.findUnique({ where: { id: e.id } });
  console.log("Re-read:", reread!.date.toISOString());
  process.exit(0);
})();
