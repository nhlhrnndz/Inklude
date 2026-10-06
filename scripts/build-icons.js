// scripts/build-icons.js
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "assets", "images", "icon-source.jpg");
const OUT_DIR = path.join(__dirname, "..", "assets", "images");

// Cream background — adjust if yours is different
const BG_COLOR = { r: 0xf5, g: 0xef, b: 0xe0, alpha: 1 };

const ICON_SIZE = 1024;
const ARTWORK_SCALE = 0.72; // 0.66 = safer, 0.72 = bolder
const FAVICON_SIZE = 48;

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`❌ Missing source: ${SRC}`);
    process.exit(1);
  }

  const srcMeta = await sharp(SRC).metadata();
  console.log(
    `📐 Source: ${srcMeta.width}x${srcMeta.height} (${srcMeta.format})`,
  );

  const box = Math.round(ICON_SIZE * ARTWORK_SCALE);

  const resized = await sharp(SRC)
    .resize({ width: box, height: box, fit: "inside" })
    .toBuffer();

  const resizedMeta = await sharp(resized).metadata();
  const offsetX = Math.round((ICON_SIZE - resizedMeta.width) / 2);
  const offsetY = Math.round((ICON_SIZE - resizedMeta.height) / 2);

  const master = await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([{ input: resized, left: offsetX, top: offsetY }])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(OUT_DIR, "icon.png"), master);
  fs.writeFileSync(path.join(OUT_DIR, "splash-icon.png"), master);

  const favicon = await sharp(master)
    .resize(FAVICON_SIZE, FAVICON_SIZE)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(OUT_DIR, "favicon.png"), favicon);

  console.log(`✅ icon.png written (${ICON_SIZE}x${ICON_SIZE})`);
  console.log(`✅ splash-icon.png written`);
  console.log(`✅ favicon.png written (${FAVICON_SIZE}x${FAVICON_SIZE})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
