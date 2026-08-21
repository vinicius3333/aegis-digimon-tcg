import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-079.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-079", () => {
  it("uses level 3 without Eiji and level 4 when Eiji is stacked", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 3 } } }, condition: { kind: "not" } }, { kind: "PlayWithoutCost", from: ["trash"], payCost: false, target: { filter: { levelComparison: { op: "lte", value: 4 } } }, condition: { kind: "selfDigivolutionStackMatchesFilter" } }]));
  it("gains one memory by trashing a hand card when attacking", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, cost: { kind: "trash" } }));
  it("inherits once-per-turn unsuspend when a Dark Animal or SoC Digimon is played", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "Unsuspend" }] }] }));
  it("trashes a hand card and gains memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-079", as: "source" }], hand: [{ card: "BT1-002", as: "cost" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("source").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002") && s.state.memory === 4);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.memory).toBe(4);
  });
});
