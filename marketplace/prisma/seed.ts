import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type SeedProduct = {
  name: string;
  description: string;
  price: number;
  category: string;
  serves?: string;
  emoji: string;
  kosherType: "meat" | "dairy" | "pareve";
  kosherForPassover?: boolean;
  labels?: string;
  perishable?: boolean;
  featured?: boolean;
};

const SAMPLE = "Sample listing: replace with the vendor's real product, price and kosher details.";

// Launch vendors. Products are placeholders until each vendor sends their real menu.
const vendors: {
  slug: string;
  name: string;
  tagline: string;
  story: string;
  city: string;
  state: string;
  originZip: string;
  emoji: string;
  certification: string;
  accentColor: string;
  courierPickup: boolean;
  freeShippingMin?: number;
  featured?: boolean;
  products: SeedProduct[];
}[] = [
  {
    slug: "ouris-market",
    name: "Ouri's Market",
    tagline: "Kosher market in Brooklyn and on the Upper East Side",
    story: "Two locations: Brooklyn (11229) and Manhattan (10065).",
    city: "Brooklyn & Manhattan",
    state: "NY",
    originZip: "11229",
    emoji: "🛒",
    certification: "OU",
    accentColor: "#b45309",
    courierPickup: true,
    featured: true,
    products: [
      { name: "Sample: Shabbos Dinner for 4", description: SAMPLE, price: 12900, category: "Prepared Foods", serves: "4", emoji: "🍗", kosherType: "meat", featured: true },
      { name: "Sample: Challah Pair", description: SAMPLE, price: 1800, category: "Bakery", serves: "8", emoji: "🥖", kosherType: "pareve", featured: true },
      { name: "Sample: Deli Platter", description: SAMPLE, price: 8900, category: "Deli", serves: "8–10", emoji: "🥪", kosherType: "meat" },
    ],
  },
  {
    slug: "eshel",
    name: "Eshel",
    tagline: "Upper East Side, New York",
    story: "",
    city: "New York",
    state: "NY",
    originZip: "10065",
    emoji: "🌳",
    certification: "OU",
    accentColor: "#15803d",
    courierPickup: true,
    featured: true,
    products: [
      { name: "Sample: Signature Platter", description: SAMPLE, price: 9900, category: "Prepared Foods", serves: "6–8", emoji: "🍽️", kosherType: "meat", featured: true },
      { name: "Sample: Family Meal", description: SAMPLE, price: 7900, category: "Prepared Foods", serves: "4", emoji: "🥘", kosherType: "meat" },
    ],
  },
  {
    slug: "jacques-torres-chocolate",
    name: "Jacques Torres Chocolate",
    tagline: "Handmade chocolates",
    story: "",
    city: "New York",
    state: "NY",
    originZip: "",
    emoji: "🍫",
    certification: "",
    accentColor: "#7c2d12",
    // Turn on in Admin once the pickup address is confirmed.
    courierPickup: false,
    featured: true,
    products: [
      { name: "Sample: Assorted Chocolate Box", description: SAMPLE, price: 4500, category: "Chocolate", serves: "8+", emoji: "🍫", kosherType: "dairy", perishable: false, featured: true },
      { name: "Sample: Chocolate Gift Tower", description: SAMPLE, price: 7500, category: "Gifts", serves: "12+", emoji: "🎁", kosherType: "dairy", perishable: false },
    ],
  },
  {
    slug: "samantha-granola",
    name: "Samantha Granola",
    tagline: "Small-batch granola",
    story: "",
    city: "",
    state: "",
    originZip: "",
    emoji: "🥣",
    certification: "",
    accentColor: "#a16207",
    courierPickup: false,
    featured: true,
    products: [
      { name: "Sample: Classic Granola", description: SAMPLE, price: 1400, category: "Pantry", emoji: "🥣", kosherType: "pareve", perishable: false, featured: true },
      { name: "Sample: Granola Gift Set", description: SAMPLE, price: 3900, category: "Gifts", emoji: "🎁", kosherType: "pareve", perishable: false },
    ],
  },
];

function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  await db.orderItem.deleteMany();
  await db.vendorOrder.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.vendor.deleteMany();

  for (const { products, ...vendor } of vendors) {
    await db.vendor.create({
      data: {
        ...vendor,
        products: {
          create: products.map((p) => ({ ...p, slug: `${vendor.slug}-${slugify(p.name)}` })),
        },
      },
    });
  }
  const count = await db.product.count();
  console.log(`Seeded ${vendors.length} vendors and ${count} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
