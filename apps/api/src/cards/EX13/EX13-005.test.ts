import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX13-005.js";

const CARD_ID = "EX13-005";

/** Fire the inherited [When Attacking] window on a host carrying the Digi-Egg. */
async function attackWindow(s: ReturnType<typeof setupEngine>, alias: string): Promise<void> {
  await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm(alias), {
    attackerPermanentId: s.perm(alias).permanentId,
  });
}

describe("EX13-005 Bebydomon", () => {
  it("matches the catalog identity", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "Bebydomon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      forms: ["In-Training"],
      types: ["Baby Dragon"],
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] You may play or use 1 card with [Dracomon] or [Examon] in its text from your hand with the cost reduced by 1.",
    });
    expect(getCardDefinition(CARD_ID)?.effectText ?? "").toBe("");
    expect(getCardDefinition(CARD_ID)?.securityEffectText ?? "").toBe("");
  });

  it("compiles the sole clause as an inherited once-per-turn play-or-use with a 1-cost reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toHaveLength(1);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: true,
                reduceCostBy: 1,
                optional: true,
                target: {
                  count: 1,
                  filter: {
                    zone: "hand",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                  },
                },
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                from: ["hand"],
                payCost: true,
                reduceCostBy: 1,
                optional: true,
                filter: {
                  zone: "hand",
                  kind: ["Option"],
                  nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                },
              },
            ],
          ],
        },
      ],
    });
    // No DigiXros allowance: the clause reaches nothing that needs one.
    expect(compiled.effects[0]?.actions?.[0]).not.toMatchObject({ options: [[{ allowDigiXros: true }], []] });
  });

  it("plays a [Dracomon] card from hand for 1 less on the public attack route, keeping the egg in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: [{ card: CARD_ID, as: "egg" }] }],
          hand: [
            { card: "EX13-008", as: "dracomon" },
            { card: "BT1-010", as: "spare" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("dracomon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed cost 3, reduced by 1, paid out of 3 memory.
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("spare").instanceId]);
    const played = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("dracomon").instanceId,
    );
    expect(played).toBeDefined();
    expect(played!.stack).toHaveLength(0);
    // The attacker survived the battle it started and still carries the Digi-Egg.
    const host = s.state.players[0]!.battleArea.find(({ permanentId }) => permanentId === hostId);
    expect(host).toBeDefined();
    expect(host!.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(host!.isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("discriminates [Dracomon]/[Examon] text from near-miss and unrelated hand cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: [{ card: CARD_ID, as: "egg" }] }],
          hand: [
            // Near miss: "Monodramon" shares the -dramon suffix but prints neither token.
            { card: "BT1-009", as: "nearMiss" },
            // Unrelated.
            { card: "BT1-010", as: "unrelated" },
            // Text-only match: named Coredramon, but its digivolution text prints [Dracomon].
            { card: "EX13-018", as: "textOnly" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();

    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);

    // Printed cost 5, reduced by 1, paid out of 4 memory.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("nearMiss").instanceId,
      s.inst("unrelated").instanceId,
    ]);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("textOnly").instanceId),
    ).toBe(true);
  });

  it("does nothing when the hand holds no card with either token", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: [{ card: CARD_ID, as: "egg" }] }],
          hand: [
            { card: "BT1-009", as: "nearMiss" },
            { card: "BT1-010", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("nearMiss").instanceId,
      s.inst("unrelated").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses a matching Option for 1 less when the play branch has no candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "host", under: [{ card: CARD_ID, as: "egg" }] },
            // A Red permanent: using a Red Option still needs its color requirement met.
            { card: "BT1-009", as: "redAlly" },
          ],
          // Unleash the Dragon Gene prints [Dracomon]/[Examon]; the Agumon beside it matches
          // neither token, so the play branch has no candidate and the use branch is forced.
          hand: [
            { card: "BT20-093", as: "option" },
            { card: "BT1-010", as: "unrelated" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    await s.ready();

    await attackWindow(s, "host");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("option").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    // Printed use cost 2, reduced by 1, paid out of 1 memory.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("unrelated").instanceId]);
    // The Option resolved its own [Main] body, which places it in the battle area.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.perm("host").topCard.instanceId,
      s.perm("redAlly").topCard.instanceId,
      s.inst("option").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("declines without paying or playing when the controller says no", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: [{ card: CARD_ID, as: "egg" }] }],
          hand: [{ card: "EX13-008", as: "dracomon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("dracomon").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("refuses a second use in the same turn and resets on the controller's next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: [{ card: CARD_ID, as: "egg" }] }],
          hand: [
            { card: "EX13-008", as: "first" },
            { card: "EX13-008", as: "second" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-010", "BT1-011"], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 2;
    await s.ready();

    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("second").instanceId]);

    // Same turn, second attack window: the once-per-turn gate refuses it.
    s.state.memory = 4;
    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("second").instanceId]);

    // A real opponent turn passes; the gate reopens on the controller's next turn.
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 2;
    await attackWindow(s, "host");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("second").instanceId),
    ).toBe(true);
  });

  it("grants the clause only to the Digimon it is under", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "host", under: [{ card: CARD_ID, as: "egg" }] },
            { card: "BT1-064", as: "peer" },
          ],
          hand: [{ card: "EX13-008", as: "dracomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await attackWindow(s, "peer");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("dracomon").instanceId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("reaches the battle area by hatching, digivolving in breeding, and moving out", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: CARD_ID, as: "egg" }],
          hand: [
            { card: "BT1-064", as: "goblimon" },
            { card: "EX13-008", as: "dracomon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === CARD_ID);
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("goblimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-064");
    // Green Lv.2 -> Green Lv.3 at printed cost 0, with the egg preserved as the source.
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    const host = s.state.players[0]!.battleArea[0]!;
    expect(host.topCard.cardId).toBe("BT1-064");
    expect(host.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    // The opponent's turn start unsuspended the target; re-suspend it so the attack is legal.
    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("dracomon").instanceId),
    );
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("dracomon").instanceId)).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
