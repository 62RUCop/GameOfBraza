import { PrismaClient } from './packages/db/node_modules/@prisma/client/index.js';
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://gob_user:gob_password@localhost:5432/gameofbraza' } } });
const r = await p.itemTemplate.findMany({ where: { name: { contains: 'Тир' } }, take: 5, select: { name: true } });
console.log('Still has Тир:', r.length, r.map(x => x.name));
const sample = await p.itemTemplate.findMany({ take: 5, select: { name: true } });
console.log('Sample names:', sample.map(x => x.name));
await p.$disconnect();
