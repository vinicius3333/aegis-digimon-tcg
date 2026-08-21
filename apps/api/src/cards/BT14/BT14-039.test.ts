import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-039.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-039", () => {
  it("has Armor Purge and gains two memory by placing a Numemon from trash underneath", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "GainMemory", amount: 2, cost: { kind: "place", destination: "digivolutionStack" } }] }));
  it("inherits Security Attack +1 for Monzaemon or Numemon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } }, while: { kind: "selfHasNameContaining" } }] }));
  it("gains two memory after placing a Numemon from trash underneath", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-039", as: "monzaemon" }], trash: [{ card: "BT14-058", as: "numemon" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monzaemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.stack.some((card) => card.cardId === "BT14-037")));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.stack.some((card) => card.cardId === "BT14-058"))).toBe(true);
    expect(s.state.memory).toBe(5);
  });
});
