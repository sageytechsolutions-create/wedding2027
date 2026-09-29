import { PrismaClient } from "@prisma/client";

// Fictional demo kosher vendors. Replace with your real vendor roster.
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
  localZipPrefixes: string;
  freeShippingMin?: number;
  shipsNationwide?: boolean;
  featured?: boolean;
  products: SeedProduct[];
}[] = [
  {
    slug: "boro-park-bakery",
    name: "Boro Park Bakery",
    tagline: "Challah, babka and rugelach since 1971",
    story: "Braided by hand every Thursday night and Friday morning. Our chocolate babka recipe hasn't changed in fifty years.",
    city: "Brooklyn",
    state: "NY",
    originZip: "11219",
    emoji: "🥖",
    certification: "OK",
    accentColor: "#d97706",
    localZipPrefixes: "100,101,102,104,112,113,114,110,115",
    freeShippingMin: 10000,
    featured: true,
    products: [
      { name: "Shabbos Challah Pair", labels: "pas-yisroel,yoshon", description: "Two 1.5 lb braided challahs, plain or sesame. Pareve.", price: 2400, category: "Bakery", serves: "8–10", emoji: "🥖", kosherType: "pareve", featured: true },
      { name: "Chocolate Babka (2)", labels: "pas-yisroel", description: "Two loaves of our dense, fudgy chocolate babka. Pareve.", price: 3600, category: "Desserts", serves: "12", emoji: "🍫", kosherType: "pareve", perishable: false, featured: true },
      { name: "Rugelach Tin", labels: "cholov-yisroel,pas-yisroel", description: "2 lbs of cinnamon, raspberry and chocolate rugelach made with real butter. Cholov Yisroel.", price: 4200, category: "Desserts", serves: "15+", emoji: "🥐", kosherType: "dairy", perishable: false },
    ],
  },
  {
    slug: "lower-east-deli",
    name: "Lower East Deli",
    tagline: "Hand-cut pastrami the old-world way",
    story: "Brined for three weeks, smoked, then steamed for hours. Glatt kosher and piled high.",
    city: "New York",
    state: "NY",
    originZip: "10002",
    emoji: "🥪",
    certification: "OU",
    accentColor: "#b91c1c",
    localZipPrefixes: "100,101,102,112,113,114",
    freeShippingMin: 15000,
    featured: true,
    products: [
      { name: "Pastrami & Corned Beef Feast", labels: "glatt,bishul-yisroel", description: "1 lb pastrami, 1 lb corned beef, rye bread, deli mustard, and full-sour pickles. Glatt kosher.", price: 11900, category: "Deli", serves: "6–8", emoji: "🥪", kosherType: "meat", featured: true },
      { name: "Matzo Ball Soup (2 qts)", labels: "glatt,bishul-yisroel", description: "Golden chicken soup with four fluffy matzo balls, carrots and dill.", price: 5400, category: "Soups", serves: "6", emoji: "🍲", kosherType: "meat" },
      { name: "Potato Knish Dozen", labels: "bishul-yisroel", description: "Twelve square potato knishes, ready to bake.", price: 3900, category: "Deli", serves: "12", emoji: "🥔", kosherType: "pareve" },
    ],
  },
  {
    slug: "lone-star-kosher-bbq",
    name: "Lone Star Kosher BBQ",
    tagline: "Glatt kosher Texas brisket, smoked 16 hours",
    story: "Proof that great barbecue and kashrut go together. Post-oak smoke, salt and pepper, and a lot of patience.",
    city: "Dallas",
    state: "TX",
    originZip: "75230",
    emoji: "🔥",
    certification: "Dallas Kosher",
    accentColor: "#9a3412",
    localZipPrefixes: "750,752",
    freeShippingMin: 15000,
    featured: true,
    products: [
      { name: "Whole Smoked Brisket", labels: "glatt,chassidishe-shechita,bishul-yisroel", description: "A full brisket, 5–6 lbs cooked, vacuum sealed with reheating instructions. Glatt kosher.", price: 18900, category: "BBQ", serves: "10–12", emoji: "🥩", kosherType: "meat", featured: true },
      { name: "Beef Rib & Pulled Brisket Combo", labels: "glatt,bishul-yisroel", description: "Four beef short ribs plus 2 lbs of pulled brisket.", price: 14900, category: "BBQ", serves: "6–8", emoji: "🍖", kosherType: "meat" },
      { name: "BBQ Sauce Trio", description: "Original, Honey Chipotle and Hot. Three 12oz bottles.", price: 2900, category: "Pantry", emoji: "🌶️", kosherType: "pareve", perishable: false },
    ],
  },
  {
    slug: "miami-beach-smokehouse-fish",
    name: "Miami Beach Appetizing",
    tagline: "Lox, whitefish and bagels for the perfect brunch",
    story: "Hand-sliced Nova, smoked whitefish salad, and bagels boiled every morning on Arthur Godfrey Road.",
    city: "Miami Beach",
    state: "FL",
    originZip: "33140",
    emoji: "🐟",
    certification: "ORC",
    accentColor: "#0369a1",
    localZipPrefixes: "331,330",
    featured: true,
    products: [
      { name: "Bagel & Lox Brunch Box", labels: "cholov-yisroel,pas-yisroel", description: "Dozen bagels, ½ lb Nova lox, whitefish salad, scallion cream cheese, capers and onion. Dairy.", price: 12900, category: "Brunch", serves: "6–8", emoji: "🥯", kosherType: "dairy", featured: true },
      { name: "Smoked Whitefish Salad (2 lbs)", description: "Creamy, smoky, classic. Pareve.", price: 5900, category: "Brunch", serves: "8–10", emoji: "🐟", kosherType: "pareve" },
    ],
  },
  {
    slug: "sweet-lakewood-chocolatier",
    name: "Lakewood Chocolatier",
    tagline: "Handmade chocolates for simchas and Mishloach Manos",
    story: "Small-batch chocolates and gift boxes, packed beautifully for every Yom Tov and simcha.",
    city: "Lakewood",
    state: "NJ",
    originZip: "08701",
    emoji: "🍫",
    certification: "CRC",
    accentColor: "#7c3aed",
    localZipPrefixes: "087,077",
    freeShippingMin: 10000,
    products: [
      { name: "Signature Truffle Box (24)", labels: "cholov-yisroel", description: "Two dozen assorted truffles. Cholov Yisroel dairy.", price: 5800, category: "Gifts", serves: "12+", emoji: "🍫", kosherType: "dairy", perishable: false },
      { name: "Passover Chocolate Gift Tower", labels: "non-gebrokts", description: "Three tiers of pareve chocolate barks, macaroons and nut clusters. Kosher for Passover.", price: 7900, category: "Gifts", serves: "15+", emoji: "🎁", kosherType: "pareve", perishable: false, kosherForPassover: true, featured: true },
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
