import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Reproduce the browser reader from the lockfile-installed official package.
// No network download, module rewriting, or third-party CDN is involved.
const require = createRequire(import.meta.url);
const packageDirectory = dirname(require.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(
  await readFile(join(packageDirectory, "package.json"), "utf8"),
);
if (
  typeof version !== "string" ||
  !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)
)
  throw Error("The installed PDF.js package has an unsupported version value.");
const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const destination = join(publicDirectory, "vendor", "pdfjs", version);
await mkdir(destination, { recursive: true });
for (const [source, filename] of [
  ["build/pdf.min.mjs", "pdf.min.mjs"],
  ["build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
  ["LICENSE", "LICENSE"],
]) {
  const bytes = await readFile(join(packageDirectory, source));
  const target = join(destination, filename);
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, bytes);
  await rename(temporary, target);
}
// Existing public/pdf.worker.min.mjs remains for historical references. Never
// remove older version directories here; open tabs may still reference them.
console.log(
  `PDF.js ${version}: synchronized browser module, worker, and license.`,
);
