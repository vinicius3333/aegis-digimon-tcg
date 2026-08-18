import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-005.js";
import "./EX3-011.js";
import "./EX3-065.js";

describe("EX3-005 Vorvomon", () => {
  it("matches its official identity and complete effect text", () => {
    expect(getCardDefinition("EX3-005")).toMatchObject({
      cardId: "EX3-005",
      nameEn: "Vorvomon",
      colors: ["Red"],
      level: 3,
      playCost: 3,
      dp: 1000,
      types: ["Rock Dragon"],
    });
    expect(getCardDefinition("EX3-005")!.effectText).toContain("Hina Kurihara");
    expect(getCardDefinition("EX3-005")!.inheritedEffectText).toContain("has an [On Play] effect");
  });
  it("deletes exactly a 3000-DP target once per turn for Hina, then resets on the next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-005", as: "vorvomon" }],
          hand: [
            { card: "EX3-065", as: "hina1" },
            { card: "EX3-065", as: "hina2" },
            { card: "EX3-065", as: "hina3" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target1", dp: 3000 },
            { card: "BT1-009", as: "target2", dp: 3000 },
            { card: "BT1-009", as: "target3", dp: 3001 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hina1").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hina2").instanceId })).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "EX3-065").length === 2,
    );
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map(({ currentDP }) => currentDP)).toEqual(
      expect.arrayContaining([3000, 3001]),
    );

    const deletionChoice = s.decisions.find(
      ({ req }) => req.sourceCardId === "EX3-005" && req.kind === "chooseTargets",
    )?.req;
    expect(deletionChoice).toMatchObject({
      sourceCardId: "EX3-005",
      options: { timing: "YourTurn", min: 1, max: 1 },
    });
    expect(deletionChoice?.options?.effectText).toContain("3000 DP or less");

    await advance(s.engine).runTurn(0);
    await advance(s.engine).verb.playInstances([s.inst("hina3").instanceId], "EX3-005");
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(3001);
  });

  it("does not trigger for Hina played by the opponent or outside its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-005", as: "vorvomon" }] },
      1: {
        hand: [{ card: "EX3-065", as: "hina" }],
        battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("hina").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-065"));
    await settle(() => s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "EX3-065"));

    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("target").permanentId)).toBe(
      true,
    );
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-005")).toBe(false);
  });

  it("its inherited attack deletion requires the carrier to have an On Play effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-011", under: ["EX3-005"], as: "attacker" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not use the inherited deletion on a carrier without an On Play effect or against 3001 DP", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-038", under: ["EX3-005"], as: "attacker" }] },
      1: {
        battleArea: [{ card: "BT1-009", as: "tooLarge", dp: 3001 }],
        security: ["BT1-009"],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX3-005")).toBe(false);
  });

  it("its inherited attack effect is not once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-011", under: ["EX3-005"], as: "attacker", dp: 20_000 }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "delete1", dp: 3000 },
            { card: "BT1-009", as: "delete2", dp: 3000 },
            { card: "BT1-012", as: "battle1", suspended: true },
            { card: "BT1-013", as: "battle2", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    for (const battle of ["battle1", "battle2"]) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm(battle).permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    }

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
