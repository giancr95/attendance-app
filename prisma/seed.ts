// Seed the DB with the 10 real users from the ZKTeco MB10-VL @ 192.168.1.202.
// Run with:  npm run db:seed
//
// On first run:
//  - Gianca 1 (deviceUserId=1) becomes ADMIN with the password from ADMIN_PASSWORD env.
//  - The other 9 users are created INACTIVE — admin sets email + password later.
//  - The MB10-VL device row is created with serial UDP3243700044.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, UserStatus, Department } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

type SeedUser = {
  deviceUid: number;
  deviceUserId: number;
  name: string;
  department: Department;
  fingerprints: number;
  hasFace: boolean;
  hasDataIssue?: boolean;
  isAdmin?: boolean;
  email?: string;
};

// Pulled live from MB10-VL @ 192.168.1.202 on 2026-04-09.
// Privilege levels: 14 = Admin on the device, 0 = User.
const SEED_USERS: SeedUser[] = [
  {
    deviceUid: 1,
    deviceUserId: 1,
    name: "Gianca",
    department: Department.ADMINISTRACION,
    fingerprints: 1,
    hasFace: true,
    isAdmin: true,
    email: "giancr95@gmail.com",
  },
  {
    deviceUid: 2,
    deviceUserId: 2,
    name: "Natasha Jimenez",
    department: Department.ADMINISTRACION,
    fingerprints: 1,
    hasFace: true,
    isAdmin: false, // device says admin but has zero punches; demoted in app
  },
  {
    deviceUid: 3,
    deviceUserId: 6,
    name: "Marcela Maltes Fajardo",
    department: Department.PRODUCCION,
    fingerprints: 1,
    hasFace: true,
  },
  {
    deviceUid: 4,
    deviceUserId: 4,
    name: "Empleado #4 (sin nombre)",
    department: Department.PRODUCCION,
    fingerprints: 1,
    hasFace: true,
    hasDataIssue: true, // device has corrupt name byte \x02
  },
  {
    deviceUid: 5,
    deviceUserId: 5,
    name: "Cindy Angulo Chavarría",
    department: Department.PRODUCCION,
    fingerprints: 1,
    hasFace: true,
  },
  {
    deviceUid: 6,
    deviceUserId: 7,
    name: "NN-7 (sin nombre)",
    department: Department.PRODUCCION,
    fingerprints: 1,
    hasFace: true,
    hasDataIssue: true,
  },
  {
    deviceUid: 7,
    deviceUserId: 8,
    name: "Lilibeth Vasquez",
    department: Department.PRODUCCION,
    fingerprints: 1,
    hasFace: true,
  },
  {
    deviceUid: 8,
    deviceUserId: 9,
    name: "NN-9 (sin nombre)",
    department: Department.ADMINISTRACION,
    fingerprints: 1,
    hasFace: true,
    hasDataIssue: true,
  },
  {
    deviceUid: 9,
    deviceUserId: 3,
    name: "Eleandro",
    department: Department.PRODUCCION,
    fingerprints: 1,
    hasFace: false,
  },
  {
    deviceUid: 10,
    deviceUserId: 10,
    name: "Francisco Aguilar",
    department: Department.PRODUCCION,
    fingerprints: 1,
    hasFace: true,
  },
];

async function main() {
  console.log("→ Seeding device row…");
  const device = await prisma.device.upsert({
    where: { serial: "UDP3243700044" },
    update: {
      name: "MB10-VL",
      ipAddress: "192.168.1.202",
      port: 4370,
      commPassword: 123456,
      firmware: "Ver 6.60 Oct 12 2021",
      platform: "ZMM510_TFT",
      mac: "00:17:61:11:9f:bf",
      location: "LaCasaDelPlastico, Liberia",
    },
    create: {
      name: "MB10-VL",
      serial: "UDP3243700044",
      ipAddress: "192.168.1.202",
      port: 4370,
      commPassword: 123456,
      firmware: "Ver 6.60 Oct 12 2021",
      platform: "ZMM510_TFT",
      mac: "00:17:61:11:9f:bf",
      location: "LaCasaDelPlastico, Liberia",
    },
  });
  console.log(`  device id: ${device.id}`);

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "ADMIN_PASSWORD env var is required to seed Gianca's admin login. Set it in .env."
    );
  }
  const adminHash = await bcrypt.hash(adminPassword, 12);

  console.log("→ Seeding users…");
  for (const u of SEED_USERS) {
    const isAdmin = u.isAdmin === true;
    await prisma.user.upsert({
      where: { deviceUserId: u.deviceUserId },
      update: {
        deviceUid: u.deviceUid,
        name: u.name,
        department: u.department,
        fingerprints: u.fingerprints,
        hasFace: u.hasFace,
        hasDataIssue: u.hasDataIssue ?? false,
      },
      create: {
        deviceUid: u.deviceUid,
        deviceUserId: u.deviceUserId,
        name: u.name,
        email: u.email,
        passwordHash: isAdmin ? adminHash : null,
        role: isAdmin ? Role.ADMIN : Role.EMPLOYEE,
        status: isAdmin ? UserStatus.ACTIVE : UserStatus.INACTIVE,
        department: u.department,
        fingerprints: u.fingerprints,
        hasFace: u.hasFace,
        hasDataIssue: u.hasDataIssue ?? false,
      },
    });
    console.log(
      `  ✓ ${u.name.padEnd(28)} ${isAdmin ? "[ADMIN]" : "[INACTIVE]"}`
    );
  }

  console.log("\nDone. Login as giancr95@gmail.com with the password you set in ADMIN_PASSWORD.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
