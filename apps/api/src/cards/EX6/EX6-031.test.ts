import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-031.js";

describe("EX6-031 Shakamon", () => {
  it("reduces Security Attack for all Digimon on play/digivolving and inverts your negative Security Attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      target: { count: "all" },
      keyword: { keyword: "SecurityAttack", amount: -1 },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SecurityAttackInvert",
      target: { count: "all" },
      duration: "forTheTurn",
    });
  });
  it("plays named materials from its stack after deletion/return and places a Security Attack Digimon into security once per turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions).toMatchObject([
      { kind: "SubTrigger", event: "onDeletionOf" },
      { kind: "SubTrigger", event: "wouldBeReturned" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true }],
    });
  });

  it("publicly gives all Digimon Security Attack -1 on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-031", as: "shaka" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shaka"));
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("publicly inverts each own negative Security Attack value during your turn", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-031", as: "shaka" }] }, 1: { security: ["BT1-001", "BT1-002"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shaka"));
    expect(observe(s.engine).keywordAmount(s.perm("shaka"), "SecurityAttack")).toBe(-1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shaka").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("publicly plays exact named cards from its stack after deletion", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-031", as: "shaka", under: ["EX6-025", "EX6-023"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("shaka").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(
      expect.arrayContaining(["EX6-025", "EX6-023"]),
    );
  });

  it("does not replay stack materials for a return destination outside hand or deck", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-031", as: "shaka", under: ["EX6-025", "EX6-023"] }] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("wouldBeReturned", {
      subjectPermanentId: s.perm("shaka").permanentId,
      returnDestination: "trash",
    });
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("shaka").topCard?.cardId).toBe("EX6-031");
    expect(s.perm("shaka").stack.map((card) => card.cardId)).toEqual(["EX6-025", "EX6-023"]);
  });

  it.each(["EX6-025", "EX6-023", "EX6-024", "EX6-026"])(
    "accepts %s as a DigiXros material and applies the two-memory reduction",
    async (material) => {
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "EX6-031", as: "shaka" },
              { card: material, as: "material" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 20;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("shaka").instanceId,
          digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
        } as never),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-031"));
      expect(s.perm("shaka").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
      expect(s.state.memory).toBe(7);
    },
  );

  it("publicly places a Security Attack Digimon into security at the end of the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-031", as: "shaka" },
            { card: "BT1-114", as: "attacker" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    await s.ready();
    preferred.push(s.inst("attacker").instanceId);
    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("shaka"));
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("attacker").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("attacker").instanceId),
    ).toBe(false);
  });

  it("also treats a negative Security Attack value as an eligible security placement target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-031", as: "shaka" },
            { card: "EX6-031", as: "negative" },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("negative"));
    expect(observe(s.engine).keywordAmount(s.perm("negative"), "SecurityAttack")).toBe(-1);
    preferred.push(s.perm("negative").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("shaka"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("negative").instanceId)).toBe(true);
  });
});
