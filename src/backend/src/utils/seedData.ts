import { prisma } from '../config/database.js';

export const SAMPLE_PROPERTIES = [
  {
    address: '123 Oak Lane',
    city: 'Denver',
    state: 'CO',
    zipCode: '80202',
    propertyType: 'single_family',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    lotSize: 5000,
    yearBuilt: 2005,
    listPrice: 450000,
    estimatedValue: 475000,
  },
  {
    address: '456 Pine Street',
    city: 'Denver',
    state: 'CO',
    zipCode: '80203',
    propertyType: 'condo',
    bedrooms: 2,
    bathrooms: 1.5,
    squareFeet: 1200,
    lotSize: 0,
    yearBuilt: 2015,
    listPrice: 380000,
    estimatedValue: 395000,
  },
  {
    address: '789 Maple Avenue',
    city: 'Boulder',
    state: 'CO',
    zipCode: '80301',
    propertyType: 'single_family',
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2400,
    lotSize: 8000,
    yearBuilt: 1998,
    listPrice: 650000,
    estimatedValue: 680000,
  },
  {
    address: '321 Elm Drive',
    city: 'Aurora',
    state: 'CO',
    zipCode: '80010',
    propertyType: 'townhouse',
    bedrooms: 3,
    bathrooms: 2.5,
    squareFeet: 1600,
    lotSize: 2000,
    yearBuilt: 2020,
    listPrice: 420000,
    estimatedValue: 430000,
  },
  {
    address: '654 Birch Road',
    city: 'Fort Collins',
    state: 'CO',
    zipCode: '80521',
    propertyType: 'single_family',
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1700,
    lotSize: 4500,
    yearBuilt: 2010,
    listPrice: 385000,
    estimatedValue: 405000,
  },
];

export async function seedDatabase() {
  console.log('🌱 Seeding database with sample properties...');

  try {
    for (const prop of SAMPLE_PROPERTIES) {
      const existing = await prisma.property.findFirst({
        where: { address: prop.address },
      });

      if (!existing) {
        await prisma.property.create({ data: prop as any });
        console.log(`✓ Created property: ${prop.address}`);
      }
    }

    const count = await prisma.property.count();
    console.log(`✅ Database seeded! Total properties: ${count}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}
