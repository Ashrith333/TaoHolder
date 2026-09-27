import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/** Inter ExtraBold (and Regular for the tagline) for next/og images, read from @fontsource. */
export async function brandFonts() {
  const dir = path.join(process.cwd(), "node_modules/@fontsource/inter/files");
  const [bold, regular] = await Promise.all([
    fs.readFile(path.join(dir, "inter-latin-800-normal.woff")),
    fs.readFile(path.join(dir, "inter-latin-400-normal.woff")),
  ]);
  return [
    { name: "Inter", data: bold, weight: 800 as const, style: "normal" as const },
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
  ];
}
