import { createHash } from "node:crypto";
import { existsSync, globSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const apiRoot = fileURLToPath(new URL("..", import.meta.url));
const cardsRoot = resolve(apiRoot, "src/cards");
const cacheDirectory = resolve(apiRoot, "node_modules/.cache/cards-bundle");
export const manifestPath = resolve(cacheDirectory, "manifest.json");

/**
 * Card modules (`src/cards/<SET>/**`, excluding tests) are data plus one `registerIrCard` call.
 * Loading ~4,700 of them as separate ES modules costs ~0.5s per worker in module overhead alone,
 * so each set is bundled into one module. One bundle per set, not one for all cards, keeps a
 * focused run that imports a single card from loading every set. Everything outside the set
 * stays external and is imported by absolute path, so the engine singletons they register into
 * are the same instances the tests import.
 */
function cardModulesBySet() {
  const files = globSync("src/cards/*/**/*.ts", { cwd: apiRoot })
    .filter((file) => !file.endsWith(".test.ts"))
    .map((file) => resolve(apiRoot, file))
    .sort();
  const sets = new Map();
  for (const file of files) {
    const set = file.slice(cardsRoot.length + 1).split("/")[0];
    if (!sets.has(set)) sets.set(set, []);
    sets.get(set).push(file);
  }
  return sets;
}

function fingerprint(files) {
  const hash = createHash("sha1");
  for (const file of files) {
    const { mtimeMs, size } = statSync(file);
    hash.update(`${file}\0${mtimeMs}\0${size}\n`);
  }
  return hash.digest("hex");
}

function bundlePathFor(set) {
  return resolve(cacheDirectory, `${set}.mjs`);
}

export async function buildCardsBundle() {
  const sets = cardModulesBySet();
  const key = fingerprint([...sets.values()].flat());
  if (existsSync(manifestPath) && JSON.parse(readFileSync(manifestPath, "utf8")).key === key) return;

  const { build } = await import("esbuild");
  const { transformSync } = await import("oxc-transform");
  const { init, parse } = await import("es-module-lexer");
  await init;

  mkdirSync(cacheDirectory, { recursive: true });
  const modules = {};
  await Promise.all(
    [...sets].map(async ([set, files]) => {
      const bundled = new Set(files);
      const index = resolve(cardsRoot, set, "index.ts");
      const entryLines = bundled.has(index) ? [`import ${JSON.stringify(index)};`] : [];
      files.forEach((file, position) => {
        const { code } = transformSync(file, readFileSync(file, "utf8"), { sourceType: "module" });
        const [, exports, , hasModuleSyntax] = parse(code);
        const names = exports.filter((entry) => !entry.typeOnly).map((entry) => entry.name);
        // `export *` names are unknown until link time; such a module is left out of the bundle.
        if (!hasModuleSyntax || exports.some((entry) => entry.type !== "direct")) {
          bundled.delete(file);
          return;
        }
        modules[file] = { set, namespace: `m${position}`, exports: names };
        entryLines.push(`export * as m${position} from ${JSON.stringify(file)};`);
      });
      const temporaryBundle = `${bundlePathFor(set)}.${process.pid}`;
      await build({
        stdin: { contents: entryLines.join("\n"), resolveDir: apiRoot, loader: "js", sourcefile: `${set}-entry.js` },
        bundle: true,
        format: "esm",
        platform: "node",
        target: "node22",
        outfile: temporaryBundle,
        logLevel: "error",
        tsconfigRaw: { compilerOptions: { experimentalDecorators: true, useDefineForClassFields: false } },
        plugins: [
          {
            name: "externalize-other-modules",
            setup(pluginBuild) {
              pluginBuild.onResolve({ filter: /.*/ }, (args) => {
                if (args.kind === "entry-point") return undefined;
                if (!args.path.startsWith(".") && !args.path.startsWith("/")) return { path: args.path, external: true };
                const base = args.path.startsWith("/") ? args.path : resolve(args.resolveDir, args.path);
                const file = base.endsWith(".js") && existsSync(base.slice(0, -3) + ".ts") ? base.slice(0, -3) + ".ts" : base;
                if (bundled.has(file)) return { path: file };
                return { path: pathToFileURL(file).href, external: true };
              });
            },
          },
        ],
      });
      renameSync(temporaryBundle, bundlePathFor(set));
    }),
  );
  const temporaryManifest = `${manifestPath}.${process.pid}`;
  writeFileSync(temporaryManifest, JSON.stringify({ key, modules }));
  renameSync(temporaryManifest, manifestPath);
}

export function loadManifest() {
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")).modules;
  } catch {
    return undefined;
  }
}

export function stubSource(entry) {
  const bundleUrl = JSON.stringify(pathToFileURL(bundlePathFor(entry.set)).href);
  const lines = [`import { ${entry.namespace} as namespace } from ${bundleUrl};`];
  for (const name of entry.exports) {
    lines.push(name === "default" ? "export default namespace.default;" : `export const ${name} = namespace.${name};`);
  }
  return lines.join("\n");
}

