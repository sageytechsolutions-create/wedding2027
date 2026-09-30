// Creates a login and prints its generated password.
//   npm run create-user -- you@example.com admin
//   npm run create-user -- staff@ouris.com vendor ouris-market
import { PrismaClient } from "@prisma/client";
import { generatePassword, hashPassword } from "../src/lib/password";

const db = new PrismaClient();

async function main() {
  const [emailArg, role, vendorSlug] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !["admin", "vendor"].includes(role) || (role === "vendor" && !vendorSlug)) {
    console.error("Usage: npm run create-user -- <email> admin\n       npm run create-user -- <email> vendor <vendor-slug>");
    process.exit(1);
  }
  const vendor = role === "vendor" ? await db.vendor.findUnique({ where: { slug: vendorSlug } }) : null;
  if (role === "vendor" && !vendor) {
    console.error(`No vendor with slug "${vendorSlug}".`);
    process.exit(1);
  }
  if (await db.user.findUnique({ where: { email } })) {
    console.error(`${email} already has a login. Reset its password from the admin page instead.`);
    process.exit(1);
  }
  const password = generatePassword();
  await db.user.create({ data: { email, role, vendorId: vendor?.id ?? null, passwordHash: await hashPassword(password) } });
  console.log(`Created ${role} login for ${email}\nPassword: ${password}\nSign in at /login and change it under Account.`);
}

main().finally(() => db.$disconnect());
