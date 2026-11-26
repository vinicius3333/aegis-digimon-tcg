import type { RulingsSetFile } from "@/game/rulings/RulingsFiles";

const loaders = new Map(
  Object.entries(import.meta.glob<RulingsSetFile>("@/game/rulings/data/sets/*.json", { import: "default" })).map(
    ([file, load]) => [file.slice(file.lastIndexOf("/") + 1, -".json".length), load],
  ),
);
const pending = new Map<string, Promise<RulingsSetFile | undefined>>();

function getCardSet(cardId: string): string {
  return /^([A-Za-z]+\d*)-/.exec(cardId)?.[1] ?? "other";
}

export function loadCardRulings(cardId: string): Promise<RulingsSetFile | undefined> {
  const set = getCardSet(cardId);
  const load = loaders.get(set);
  if (load === undefined) {
    return Promise.resolve(undefined);
  }
  let loaded = pending.get(set);
  if (loaded === undefined) {
    loaded = load().catch(() => {
      pending.delete(set);
      return undefined;
    });
    pending.set(set, loaded);
  }
  return loaded;
}
