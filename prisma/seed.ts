import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const connectionString = process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // =========================================================
  // 1. CREATE / UPDATE SAMPLE JOB
  // =========================================================

  const job = await prisma.job.upsert({
    where: {
      jobCode: "E337",
    },

    update: {},

    create: {
      jobCode: "E337",
      gender: "FEMALE",
      grade: "KG",
      subject: "All",
      place: "Bole, Addis Ababa",
      salary: 4800,
      status: "OPEN",
      daysPerWeek: 5,
      hoursPerDay: 2,
    },
  });

  console.log("✅ Job created successfully:");
  console.log(job);


  // =========================================================
  // 2. CREATE INITIAL ADMIN ACCOUNT
  // =========================================================

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName =
    process.env.ADMIN_NAME || "System Administrator";

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not defined");
  }

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is not defined");
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: {
      email: adminEmail,
    },
  });

  if (existingAdmin) {
    console.log("ℹ️ Admin account already exists:");
    console.log(adminEmail);
  } else {
    const passwordHash = await hashPassword(adminPassword);

    const admin = await prisma.admin.create({
      data: {
        fullName: adminName,
        email: adminEmail,
        passwordHash,
      },
    });

    console.log("✅ Admin account created successfully:");
    console.log({
      id: admin.id,
      fullName: admin.fullName,
      email: admin.email,
    });
  }
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });