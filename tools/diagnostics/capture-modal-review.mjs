import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const output = resolve(root, "apps/web/public/dev/modal-review");
mkdirSync(output, { recursive: true });
const scope = [
  "--worktree",
  `path:${root}`,
  "--page",
  process.env.ORCA_REVIEW_PAGE ?? "752939d5-c624-4a7c-997f-4619db3d9079",
];
function orca(...args) {
  const result = JSON.parse(
    execFileSync("orca", [...args, ...scope, "--json"], {
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 16 * 1024 * 1024,
    }),
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.result;
}
const source = readFileSync(resolve(root, "apps/web/src/dev/EffectPromptGallery.tsx"), "utf8");
const cases = [
  ...source
    .slice(source.indexOf("export const EFFECT_PROMPT_CASES"), source.indexOf("] as const;"))
    .matchAll(/\["([^"]+)", "([^"]+)", "([^"]+)"\]/g),
].map(([, id, title]) => ({ id, title, url: `/dev/effect-prompts?case=${id}&controls=0` }));
cases.push(
  {
    id: "digixros-materials",
    title: "DigiXros · materiais sem efeito do Tamer",
    url: "/dev/effect-prompts?case=digixros&controls=0",
    answer: false,
  },
  {
    id: "digixros-expanded-materials",
    title: "DigiXros · materiais com efeito do Tamer",
    url: "/dev/effect-prompts?case=digixros&controls=0",
    answer: true,
  },
);
for (const [id, title] of [
  ["decision-selection-rail", "Seleção física de cartas · mão"],
  ["decision-field-budget", "Seleção física de cartas · campo e limite de custo"],
  ["card-action-sheet", "Carta em campo · ações"],
  ["stack-viewer-sheet", "Fontes de digievolução · inspeção"],
  ["trash-viewer-sheet", "Lixo · inspeção"],
  ["card-zoom", "Carta ampliada"],
  ["play-log", "Histórico da partida"],
  ["hand-inspector-BT22-052", "Carta da mão · inspeção e ações"],
  ["hand-inspector-EX5-030", "Carta da mão · efeitos longos"],
  ["alliance-confirmation", "Alliance · confirmar aliado"],
  ["game-over-win", "Fim da partida · vitória"],
  ["game-over-loss", "Fim da partida · derrota"],
  ["opponent-dropped", "Oponente desconectado"],
])
  cases.push({ id, title, url: `/dev/mobile?specimen=${id}&frame=1&locale=pt-BR` });
const formats = [
  ["mobile", 390, 844],
  ["desktop", 1440, 1000],
];
const requested = process.argv.slice(2);
if (requested.includes("--manifest")) {
  writeFileSync(resolve(output, "manifest.json"), `${JSON.stringify(cases, null, 2)}\n`);
  process.exit(0);
}
let failed = false;
for (const item of cases.filter((candidateCase) => !requested.length || requested.includes(candidateCase.id))) {
  for (const [format, width, height] of formats) {
    const file = resolve(output, `${item.id}-${format}.png`);
    if (!requested.length && existsSync(file)) continue;
    try {
      orca("goto", "--url", `http://localhost:5184${item.url}`);
      orca("exec", "--command", `set viewport ${width} ${height}`);
      orca("wait", "--selector", item.url.startsWith("/dev/mobile") ? ".mobile-lab-frame" : ".effect-prompt-gallery");
      orca("wait", "--load", "networkidle");
      if (item.answer !== undefined) {
        const snapshot = orca("snapshot");
        const entry = Object.entries(snapshot.refs).find(
          ([, value]) => value.role === "button" && (item.answer ? /^sim|^yes|^use$/i : /^não,|^no,/i).test(value.name),
        );
        if (!entry) throw new Error("Tamer answer missing from snapshot");
        orca("click", "--element", `@${entry[0]}`);
        orca("wait", "--selector", ".material-prompt");
      }
      orca(
        "eval",
        "--expression",
        '(async () => { await document.fonts.ready; await Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.addEventListener("load", r, {once:true}); i.addEventListener("error", r, {once:true}); }))); return "ready"; })()',
      );
      const screenshot = orca("screenshot");
      writeFileSync(file, Buffer.from(screenshot.data.replace(/^data:[^,]*,/, ""), "base64"));
      process.stdout.write(`${item.id} ${format}\n`);
    } catch (error) {
      failed = true;
      process.stderr.write(`FAILED ${item.id} ${format}: ${error.message}\n`);
    }
  }
}
writeFileSync(resolve(output, "manifest.json"), `${JSON.stringify(cases, null, 2)}\n`);
process.exitCode = failed ? 1 : 0;
