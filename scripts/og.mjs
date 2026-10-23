// Renders public/og.png (1200×630) from an inline SVG with sharp: the mark, the title, the address.
// Run by hand (`pnpm og`) when the wording changes; the PNG is committed.
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0e1413"/>
  <g transform="translate(96 195) scale(3.75)">
    <rect width="64" height="64" rx="16" fill="#0f766e"/>
    <path d="M27 16h10v11h11v10H37v11H27V37H16V27h11z" fill="#f0fdfa"/>
  </g>
  <g font-family="Noto Sans, DejaVu Sans, sans-serif" fill="#e4ecea">
    <text x="440" y="265" font-size="68" font-weight="700">Seu plano de saúde,</text>
    <text x="440" y="345" font-size="68" font-weight="700">em dados abertos</text>
    <text x="440" y="425" font-size="24" fill="#93a3a0">reclamações · nota da ANS · cancelamentos · portabilidade</text>
    <text x="440" y="515" font-size="34" fill="#2dd4bf">saude.abelhaninja.de</text>
  </g>
</svg>`;

const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
await writeFile(new URL("../public/og.png", import.meta.url), png);
console.log(`public/og.png: ${png.length} bytes`);
