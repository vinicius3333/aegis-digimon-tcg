import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
describe("ST21-03", () => {
  it("matches the catalog and executable security clause", () => {
    expect(getCardDefinition("ST21-03")?.effectText).toContain("At the end of the battle");
    const effect = runtimeCompiledCard("ST21-03")?.effects.find(x => x.trigger === "Security");
    expect(effect?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } });
  });
  it("restricts only opponent Digimon without evolution cards after removing two sources", () => {
    const effect = runtimeCompiledCard("ST21-03")?.effects.find(x => x.trigger === "OnPlay");
    expect(effect?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "TrashDigivolution", amount: 2, fromTop: true }),
      expect.objectContaining({ kind: "Restrict", restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }),
    ]));
  });

  it("plays itself from security, then resolves On Play without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST21-03", as: "securityIkkakumon", faceUp: true }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityIkkakumon"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST21-03"));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST21-03")).toBe(true);
    expect((s.state.players[0] as PlayerState).security).not.toContainEqual(expect.objectContaining({ cardId: "ST21-03" }));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(true);
  });

  it("draws only at 7 or fewer cards and keeps the inherited trigger once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST21-04", as: "host", under: ["ST21-03"] }], hand: ["BT1-001"], deck: ["BT1-002"] },
      1: { security: ["BT1-003", "BT1-004", "BT1-005"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const before = (s.state.players[0] as PlayerState).hand.length;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => (s.state.players[0] as PlayerState).hand.length > before);
    expect((s.state.players[0] as PlayerState).hand.length).toBe(before + 1);
  });
});
