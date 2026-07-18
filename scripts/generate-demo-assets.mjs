import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const out = path.join(process.cwd(), "public/demo/generated");
await mkdir(out, { recursive: true });

const projects = [
  { id:"northline", label:"Logo", title:"Northline Studio", desc:"Geometric mountain and wordmark", art:`<path d="M70 190 154 62l45 68 28-42 83 102H70Z"/><path d="m116 190 39-59 20 30 24-31 49 60H116Z" fill="#fff"/><text x="190" y="240" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" letter-spacing="5">NORTHLINE</text><text x="190" y="267" text-anchor="middle" font-family="Arial" font-size="13" letter-spacing="7">STUDIO</text>` },
  { id:"harbor", label:"Badge", title:"Harbor Coffee", desc:"Circular coffee shop badge", art:`<circle cx="190" cy="160" r="112" fill="none" stroke="#111815" stroke-width="14"/><path d="M137 135h88v49a44 44 0 0 1-88 0v-49Zm88 10h17c27 0 27 38 0 38h-17" fill="none" stroke="#111815" stroke-width="13"/><path d="M166 117c-14-15 13-22 0-39m42 39c-14-15 13-22 0-39" fill="none" stroke="#111815" stroke-width="8" stroke-linecap="round"/><text x="190" y="295" text-anchor="middle" font-family="Arial" font-size="24" font-weight="700" letter-spacing="3">HARBOR COFFEE</text>` },
  { id:"pet", label:"Pet", title:"Loyal Companion", desc:"Original generic dog profile", art:`<path d="M91 253c12-56 35-81 67-91-17-21-18-45-7-70 17 7 33 18 46 34 29-6 58 2 79 22l31 8-22 26c-5 48-35 81-86 88-34 5-70 0-108-17Zm105-95c0 7 11 7 11 0s-11-7-11 0Z" fill-rule="evenodd"/>` },
  { id:"rocket", label:"Cartoon", title:"Little Voyager", desc:"Friendly rocket illustration", art:`<path d="M190 55c53 34 77 82 64 145l-64 37-64-37c-13-63 11-111 64-145Z"/><circle cx="190" cy="137" r="27" fill="#fff"/><path d="m129 176-43 46 52 4m113-50 43 46-52 4M164 235l26 58 26-58"/><path d="M179 259h22l-11 36-11-36Z" fill="#fff"/>` },
  { id:"make", label:"Text", title:"Make Something", desc:"One-color text design", art:`<text x="190" y="145" text-anchor="middle" font-family="Arial Black,Arial" font-size="56" font-weight="900">MAKE</text><text x="190" y="211" text-anchor="middle" font-family="Arial Black,Arial" font-size="46" font-weight="900">SOMETHING</text><path d="M74 239h232v12H74zM92 83h196v9H92z"/>` },
  { id:"floral", label:"AI Artwork", title:"Petal Geometry", desc:"Floral geometric illustration", art:`<g transform="translate(190 165)"><ellipse rx="35" ry="105"/><ellipse rx="35" ry="105" transform="rotate(45)"/><ellipse rx="35" ry="105" transform="rotate(90)"/><ellipse rx="35" ry="105" transform="rotate(135)"/><circle r="37" fill="#fff"/><circle r="20"/></g><path d="M190 270v40m-48-18h96" fill="none" stroke="#111815" stroke-width="10" stroke-linecap="round"/>` },
];

for (const p of projects) {
  const clean = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 340"><rect width="380" height="340" fill="#fff"/><g fill="#111815">${p.art}</g></svg>`;
  const source = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="340" viewBox="0 0 380 340"><defs><filter id="r"><feTurbulence baseFrequency=".8" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter></defs><rect width="380" height="340" fill="#ece9e1"/><g opacity=".86" filter="url(#r)" fill="#28312d">${p.art}</g><path d="M0 45h380M0 175h380M0 292h380" stroke="#fff" opacity=".12"/></svg>`;
  await writeFile(path.join(out, `${p.id}.svg`), clean);
  await sharp(Buffer.from(source)).resize(760,680).png({ quality:82, palette:true }).toFile(path.join(out, `${p.id}-original.png`));
  await sharp(Buffer.from(clean)).resize(180,160).png({ quality:80, palette:true }).toFile(path.join(out, `${p.id}-thumb.png`));
  await writeFile(path.join(out, `${p.id}.json`), JSON.stringify({ ...p, original:`/demo/generated/${p.id}-original.png`, result:`/demo/generated/${p.id}.svg`, thumbnail:`/demo/generated/${p.id}-thumb.png` }, null, 2));
}

console.log(`Generated ${projects.length} original demo projects in ${out}`);
