import { describe, expect, it } from "vitest";
import { allRegisteredModules } from "./registry.js";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "./interpreter.js";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/index.js";

interface RawNode {
  cardId: string;
  path: string;
  raw: string;
}

function collectRawNodes(): RawNode[] {
  const nodes: RawNode[] = [];
  const walk = (cardId: string, path: string, value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(cardId, `${path}[${index}]`, entry));
      return;
    }
    if (value === null || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (record.kind === "raw" && typeof record.raw === "string") {
      nodes.push({ cardId, path, raw: record.raw });
    }
    Object.entries(record).forEach(([key, entry]) => walk(cardId, `${path}.${key}`, entry));
  };
  for (const cardId of allRegisteredModules().keys()) {
    if (!hasRegisteredCompiledCard(cardId)) continue;
    walk(cardId, "", runtimeCompiledCard(cardId));
  }
  return nodes;
}

describe("raw IR guard", () => {
  it("keeps the current raw-node inventory explicit and prevents silent growth", () => {
    const nodes = collectRawNodes();
    const cards = new Set(nodes.map((node) => node.cardId));
    // The plan's historical main-tree baseline was 281 nodes / 216 cards. The
    // inline runtime modules currently expose 33 nodes / 22 cards after the
    // latest typed condition re-encodings. The upstream effects.json
    // fallback is excluded because it is not the runtime source for hand-written modules.
    expect({ nodes: nodes.length, cards: cards.size }).toEqual({ nodes: 33, cards: 22 });
    expect(nodes.every((node) => node.raw.length > 0)).toBe(true);
  });

  it("does not reintroduce the Phase 1 raw spellings", () => {
    const migrated = new Set([
      "DNA digivolving",
      "DNA Digivolving",
      "DigiXrosing",
      "there're 6 or fewer total cards in both players' security stacks",
    ]);
    expect(collectRawNodes().filter((node) => migrated.has(node.raw))).toEqual([]);
  });

  it("does not offer an activation whose whole condition is still raw", async () => {
    const setup = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-010", as: "biyomon" },
            { card: "BT13-011", as: "garudamon" },
          ],
          battleArea: [{ card: "BT13-009", as: "kristy" }],
        },
      },
      { autoAcceptOptional: true },
    );
    setup.state.memory = 20;
    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: setup.inst("biyomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 30);
    expect(setup.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(0);
    expect(setup.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT13-011")).toBe(false);
  });
});
