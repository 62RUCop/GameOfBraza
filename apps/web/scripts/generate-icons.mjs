// Одноразовый генератор PWA-иконок из public/icon_src.png через sharp.
// Запуск: pnpm --filter @gob/web icons
//
// Логотип — тёмная линеарт-графика на прозрачном фоне, рассчитан на светлый фон,
// поэтому maskable/apple-варианты кладутся на белый (BG) ради контраста, а
// «any»-иконки и favicon остаются прозрачными.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");
const src = path.join(webRoot, "public", "icon_src.png");
const iconsDir = path.join(webRoot, "public", "icons");
const appDir = path.join(webRoot, "src", "app");

const BG = { r: 255, g: 255, b: 255, alpha: 1 }; // непрозрачный фон под maskable/apple
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

await mkdir(iconsDir, { recursive: true });

const meta = await sharp(src).metadata();
console.log(`source: ${meta.width}x${meta.height} hasAlpha=${meta.hasAlpha}`);

// Квадратная база 512×512 на прозрачном фоне (исходник 512×513 → выравниваем без искажений).
const base = await sharp(src)
  .resize(512, 512, { fit: "contain", background: TRANSPARENT })
  .png()
  .toBuffer();

// purpose: "any" — сохраняем прозрачность исходника.
await sharp(base).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192.png"));
await sharp(base).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512.png"));

// purpose: "maskable" — логотип в safe-zone (80%) по центру непрозрачного фона,
// чтобы круговая обрезка ОС не срезала верхний/нижний текст.
const safe = Math.round(512 * 0.8);
const safeLogo = await sharp(base)
  .resize(safe, safe, { fit: "contain", background: TRANSPARENT })
  .toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
  .composite([{ input: safeLogo, gravity: "center" }])
  .png()
  .toFile(path.join(iconsDir, "icon-maskable-512.png"));

// favicon (Next.js app/icon.png) — прозрачный, мелкий.
await sharp(base).resize(96, 96).png().toFile(path.join(appDir, "icon.png"));

// apple-touch (Next.js app/apple-icon.png) — iOS не уважает прозрачность, кладём на белый.
await sharp(base).resize(180, 180).flatten({ background: BG }).png().toFile(path.join(appDir, "apple-icon.png"));

console.log("icons generated:");
console.log("  public/icons/icon-192.png, icon-512.png, icon-maskable-512.png");
console.log("  src/app/icon.png (favicon), src/app/apple-icon.png (apple-touch)");
