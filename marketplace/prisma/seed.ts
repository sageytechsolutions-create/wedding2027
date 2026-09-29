import { PrismaClient } from "@prisma/client";

// Fictional demo vendors. Replace with your real vendor roster.
const db = new PrismaClient();

type SeedProduct = {
  name: string;
  description: string;
  price: number;
  category: string;
  serves?: string;
  emoji: string;
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
  accentColor: string;
  localZipPrefixes: string;
  freeShippingMin?: number;
  shipsNationwide?: boolean;
  featured?: boolean;
  products: SeedProduct[];
}[] = [
  {
    slug: "mulberry-street-bagels",
    name: "Mulberry Street Bagels",
    tagline: "Hand-rolled, kettle-boiled since 1962",
    story: "Three generations of the same family have boiled bagels in the same copper kettle on Mulberry Street. We bake overnight and pack them the morning they ship.",
    city: "New York",
    state: "NY",
    originZip: "10013",
    emoji: "🥯",
    accentColor: "#d97706",
    localZipPrefixes: "100,101,102,112,113,114",
    freeShippingMin: 12000,
    featured: true,
    products: [
      { name: "Dozen Bagel Sampler + Schmear", description: "12 hand-rolled bagels (everything, sesame, poppy, plain) with two tubs of whipped cream cheese.", price: 6900, category: "Breakfast", serves: "6–8", emoji: "🥯", featured: true },
      { name: "Lox & Bagel Brunch Kit", description: "Six bagels, ½ lb hand-sliced Nova lox, scallion schmear, capers and red onion.", price: 9900, category: "Breakfast", serves: "4–6", emoji: "🐟" },
      { name: "Black & White Cookies (8)", description: "Soft cake cookies half-dipped in vanilla and chocolate fondant.", price: 4200, category: "Desserts", serves: "8", emoji: "🍪", perishable: false },
    ],
  },
  {
    slug: "big-sky-smokehouse",
    name: "Big Sky Smokehouse",
    tagline: "Post-oak brisket, smoked 16 hours",
    story: "Our pits run 24/7 off Texas post oak. Every brisket is trimmed by hand, rubbed with salt and pepper, and smoked low until it jiggles.",
    city: "Austin",
    state: "TX",
    originZip: "78702",
    emoji: "🔥",
    accentColor: "#b91c1c",
    localZipPrefixes: "786,787",
    freeShippingMin: 15000,
    featured: true,
    products: [
      { name: "Whole Smoked Brisket", description: "A full packer brisket, 5–6 lbs cooked, vacuum sealed with reheating instructions.", price: 17900, category: "BBQ", serves: "10–12", emoji: "🥩", featured: true },
      { name: "Rib & Sausage Combo", description: "Two racks of pork spare ribs plus 2 lbs of jalapeño cheddar sausage.", price: 12900, category: "BBQ", serves: "6–8", emoji: "🍖" },
      { name: "House BBQ Sauce Trio", description: "Original, Espresso, and Hot. Three 12oz bottles.", price: 2900, category: "Pantry", emoji: "🌶️", perishable: false },
    ],
  },
  {
    slug: "lakeshore-deep-dish",
    name: "Lakeshore Deep Dish",
    tagline: "Buttery-crust Chicago deep dish",
    story: "Par-baked in our seasoned pans, flash frozen, and packed in dry ice so you can finish it in your own oven.",
    city: "Chicago",
    state: "IL",
    originZip: "60611",
    emoji: "🍕",
    accentColor: "#dc2626",
    localZipPrefixes: "600,606,607,608",
    featured: true,
    products: [
      { name: "Deep Dish Pizza 4-Pack", description: "Two cheese, two sausage. 9-inch pies, ready in 40 minutes.", price: 8900, category: "Pizza", serves: "8", emoji: "🍕", featured: true },
      { name: "Italian Beef Kit", description: "2 lbs thin-sliced beef, jus, giardiniera, sweet peppers and 8 rolls.", price: 9400, category: "Sandwiches", serves: "8", emoji: "🥪" },
    ],
  },
  {
    slug: "bayou-king-cakes",
    name: "Bayou King Cakes",
    tagline: "New Orleans cakes & crawfish boil kits",
    story: "Braided brioche, cinnamon, and a whole lot of purple, green and gold. Baked in the Marigny since 1988.",
    city: "New Orleans",
    state: "LA",
    originZip: "70117",
    emoji: "🎭",
    accentColor: "#7c3aed",
    localZipPrefixes: "700,701",
    freeShippingMin: 10000,
    products: [
      { name: "Traditional King Cake", description: "Cinnamon brioche with classic icing and colored sugar. Baby included.", price: 5400, category: "Desserts", serves: "12–15", emoji: "🎂", featured: true },
      { name: "Cream Cheese King Cake", description: "Filled with sweet cream cheese. Our best seller.", price: 5900, category: "Desserts", serves: "12–15", emoji: "🍰" },
      { name: "Gumbo Kit", description: "Two quarts of chicken & andouille gumbo with rice.", price: 7900, category: "Soups", serves: "6", emoji: "🍲" },
    ],
  },
  {
    slug: "harbor-lobster-co",
    name: "Harbor Lobster Co.",
    tagline: "Maine lobster rolls, off the boat",
    story: "We buy directly from the Portland pier each morning. Claw and knuckle meat, cooked and picked the same day.",
    city: "Portland",
    state: "ME",
    originZip: "04101",
    emoji: "🦞",
    accentColor: "#0369a1",
    localZipPrefixes: "040,041",
    featured: true,
    products: [
      { name: "Lobster Roll Kit (4)", description: "1 lb fresh-picked lobster meat, split-top rolls, butter and mayo.", price: 13900, category: "Seafood", serves: "4", emoji: "🦞", featured: true },
      { name: "New England Clam Chowder", description: "Two quarts of our creamy chowder with oyster crackers.", price: 6400, category: "Soups", serves: "6", emoji: "🥣" },
    ],
  },
  {
    slug: "golden-gate-sourdough",
    name: "Golden Gate Sourdough",
    tagline: "A 90-year-old starter, still going",
    story: "Our mother dough came over on a steamship in 1935. We still feed her twice a day.",
    city: "San Francisco",
    state: "CA",
    originZip: "94133",
    emoji: "🍞",
    accentColor: "#92400e",
    localZipPrefixes: "940,941,945,946",
    shipsNationwide: true,
    products: [
      { name: "Sourdough Round Trio", description: "Three 1.5 lb rounds: classic, olive, and seeded.", price: 4800, category: "Bakery", serves: "10+", emoji: "🍞" },
      { name: "Clam Chowder Bread Bowls", description: "Four sourdough bowls with a quart of chowder.", price: 6900, category: "Soups", serves: "4", emoji: "🥖" },
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
