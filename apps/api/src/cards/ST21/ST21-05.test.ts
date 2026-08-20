import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-05", () => {
  it("matches the Adventure Tamer play clause", () => {
    expect(getCardDefinition("ST21-05")?.effectText).toContain("1 or fewer Tamers");
    const a = runtimeCompiledCard("ST21-05")?.effects.find(x => x.trigger === "WhenDigivolving")?.actions[0];
    expect(a).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "permanentCount", op: "lte", value: 1 } });
  });
  it("gives exactly one opposing Digimon minus 2000 DP once per turn", () => {
    const e = runtimeCompiledCard("ST21-05")?.effects.find(x => x.trigger === "WhenAttacking");
    expect(e).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { count: 1 } }] });
  });

  it("may play one Adventure Tamer from hand when the one-Tamer boundary is met", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST21-02", as: "host" }], hand: [{ card: "ST21-05", as: "angemon" }, "ST21-13"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("host").permanentId, instanceId: s.inst("angemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST21-13"));
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "ST21-13")).toHaveLength(1);
    expect((s.state.players[0] as PlayerState).hand.some((card) => card.cardId === "ST21-13")).toBe(false);
  });

  it("applies inherited -2000 DP to one opposing Digimon during its attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST21-04", as: "attacker", under: ["ST21-05"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }], security: ["BT1-003"] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);
  });
});
