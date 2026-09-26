// A8: no signRaw, no seed/mnemonic handling, no private keys anywhere in src/.
import fs from "node:fs";
import path from "node:path";

const BANNED = [/signRaw/, /mnemonic/i, /seed\s*phrase/i, /privateKey/i, /mnemonicToMiniSecret/, /fromUri\(/];
let bad = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) {
      const src = fs.readFileSync(p, "utf8");
      for (const re of BANNED) if (re.test(src)) (bad++, console.error(`✗ ${p}: matches ${re}`));
    }
  }
})("src");
if (bad) process.exit(1);
console.log("security grep ok");
