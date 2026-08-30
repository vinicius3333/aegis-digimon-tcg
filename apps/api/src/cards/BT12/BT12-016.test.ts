import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-016.js";

describe("BT12-016 WarGrowlmon", () => {
  it("deletes one opposing Digimon at the inclusive 4000 DP boundary and does not follow up", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-016", as: "war" }], hand: [{ card: "BT12-018", as: "gallant" }] },
        1: { battleArea: [{ card: "BT1-009", dp: 4000, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("war"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("war").topCard.cardId).toBe("BT12-016");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("gallant").instanceId);
  });

  it("may digivolve into a level 6 Gallantmon for its cost reduced by 1 when no Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-016", as: "war" }],
          hand: [{ card: "BT12-018", as: "gallant" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("war"));
    await settle(() => s.perm("war").topCard.cardId === "BT12-018");
    expect(s.state.memory).toBe(7);
    expect(s.perm("war").stack.map(({ cardId }) => cardId)).toContain("BT12-016");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it.each([
    ["ChaosGallantmon with unmet purple requirements", "BT5-081"],
    ["level 7 Gallantmon Crimson Mode", "EX2-073"],
  ])("does not offer %s as the follow-up", async (_case, candidate) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT12-016", as: "war" }], hand: [{ card: candidate, as: "candidate" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("war"));
    expect(s.perm("war").topCard.cardId).toBe("BT12-016");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("candidate").instanceId);
  });

  it("gains 2 memory at end of attack only for a Growlmon/Gallantmon host with no opposing Digimon", async () => {
    const eligible = setupEngine({ 0: { battleArea: [{ card: "BT12-018", as: "host", under: ["BT12-016"] }] } });
    await advance(eligible.engine).fire(EffectTiming.EndOfAttack, eligible.perm("host"));
    expect(eligible.state.memory).toBe(2);
    await advance(eligible.engine).fire(EffectTiming.EndOfAttack, eligible.perm("host"));
    expect(eligible.state.memory).toBe(2);

    const wrongName = setupEngine({ 0: { battleArea: [{ card: "BT12-017", as: "host", under: ["BT12-016"] }] } });
    await advance(wrongName.engine).fire(EffectTiming.EndOfAttack, wrongName.perm("host"));
    expect(wrongName.state.memory).toBe(0);

    const opponentPresent = setupEngine({
      0: { battleArea: [{ card: "BT12-018", as: "host", under: ["BT12-016"] }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    await advance(opponentPresent.engine).fire(EffectTiming.EndOfAttack, opponentPresent.perm("host"));
    expect(opponentPresent.state.memory).toBe(0);
  });

  it("does not trigger the inherited effect when its attacker is deleted in a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-013", as: "host", under: ["BT12-016"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 4000, suspended: true }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);
    expect(s.state.memory).toBe(0);
  });
});
