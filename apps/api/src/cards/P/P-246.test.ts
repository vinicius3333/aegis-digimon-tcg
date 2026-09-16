import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as P_246 } from "./P-246.js";
import "../index.js";

const CARD_ID = "P-246";

describe("P-246 Motimon", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Motimon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      playCost: -1,
      inheritedEffectText:
        "[Your Turn] [Once Per Turn] When any of your other Digimon with [Sukamon] or [Mamemon] in their names are deleted, this Digimon may digivolve into a Digimon card with [Sukamon], [Etemon] or [Mamemon] in its name in the hand with the cost reduced by 2.",
    });
    expect(getCardDefinition(CARD_ID)?.effectText).toBeUndefined();
    expect(getCardDefinition(CARD_ID)?.securityEffectText).toBeUndefined();
  });

  it("maps the single printed clause onto IR with no residual", () => {
    expect(P_246.coverage).toBe("full");
    expect(P_246.residual).toEqual([]);
    expect(P_246.effects).toHaveLength(1);
    expect(P_246.effects[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeSelf: true,
            nameOrTrait: [{ tokens: ["Sukamon", "Mamemon"], match: "name" }],
          },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              into: {
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Sukamon", "Etemon", "Mamemon"], match: "name" }],
              },
              from: ["hand"],
              payCost: true,
              costDelta: -2,
              optional: true,
            },
          ],
        },
      ],
    });
  });

  it("digivolves the egg's host out of the hand for 0 memory when your [Sukamon] dies in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT14-034", as: "sukamon" },
          ],
          hand: [{ card: "BT13-065", as: "platinum" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.perm("host").topCard.cardId === "BT13-065");
    await settle();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("platinum").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["P-246", "BT2-052"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT13-065");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-034"]);
    expect(s.state.memory).toBe(memoryBeforeAttack);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("fires for a [Mamemon] name deletion too, matched as a substring (BigMamemon)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT6-063", as: "bigMamemon" },
          ],
          hand: [{ card: "BT13-065", as: "platinum" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("bigMamemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.perm("host").topCard.cardId === "BT13-065");
    await settle();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("platinum").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT6-063"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("reduces the cost by exactly 2, paying 1 for a cost-3 destination", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-056", as: "host", under: [CARD_ID] },
            { card: "BT14-034", as: "sukamon" },
          ],
          hand: [{ card: "BT6-064", as: "mamemon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.perm("host").topCard.cardId === "BT6-064");
    await settle();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("mamemon").instanceId);
    expect(s.state.memory).toBe(memoryBeforeAttack - 1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not fire for an [Etemon] deletion, even though [Etemon] is a legal destination name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT3-070", as: "etemon" },
          ],
          hand: [{ card: "BT13-065", as: "platinum" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("etemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.perm("host").topCard.cardId).toBe("BT2-052");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("platinum").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not fire for a deletion of a Digimon with neither name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT1-024", as: "plain" },
          ],
          hand: [{ card: "BT13-065", as: "platinum" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.perm("host").topCard.cardId).toBe("BT2-052");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("platinum").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not fire for the OPPONENT's [Sukamon] deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT1-080", as: "wall", suspended: true },
          ],
          hand: [{ card: "BT13-065", as: "platinum" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT14-034", as: "theirSukamon" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("theirSukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.perm("host").topCard.cardId).toBe("BT2-052");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("platinum").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("does not fire on the opponent's turn, even for your own [Sukamon] deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT14-034", as: "sukamon", suspended: true },
          ],
          hand: [{ card: "BT13-065", as: "platinum" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "theirAttacker" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("theirAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("sukamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-034"]);
    expect(s.perm("host").topCard.cardId).toBe("BT2-052");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("platinum").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("cannot reach a legal destination that is in the trash — the clause says 'in the hand'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT14-034", as: "sukamon" },
          ],
          hand: [{ card: "BT1-009", as: "spare" }],
          trash: [{ card: "BT13-065", as: "platinum" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.perm("host").topCard.cardId).toBe("BT2-052");
    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT13-065", "BT14-034"]);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("leaves everything alone when the controller declines the optional digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT14-034", as: "sukamon" },
          ],
          hand: [{ card: "BT13-065", as: "platinum" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("sukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.perm("host").topCard.cardId).toBe("BT2-052");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("platinum").instanceId]);
    expect(s.state.memory).toBe(memoryBeforeAttack);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("resets once-per-turn after a natural turn and keeps the exact egg source on the host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [{ card: CARD_ID, as: "source" }] },
            { card: "BT14-034", as: "firstSukamon" },
            { card: "BT14-034", as: "secondSukamon" },
            { card: "BT14-034", as: "thirdSukamon" },
          ],
          hand: [
            { card: "BT13-065", as: "platinum" },
            { card: "BT6-064", as: "mamemon" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: Array.from({ length: 5 }, () => "BT1-009"),
        },
        1: {
          hand: [{ card: "BT3-059", as: "opponentPlayable" }],
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: Array.from({ length: 20 }, () => "BT1-012"),
          security: Array.from({ length: 5 }, () => "BT1-012"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    const hostId = s.perm("host").permanentId;
    const sourceId = s.inst("source").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstSukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.perm("host").topCard.cardId === "BT13-065");
    await settle();

    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId, s.inst("host").instanceId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("firstSukamon").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondSukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("platinum").instanceId);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("mamemon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("firstSukamon").instanceId,
      s.inst("secondSukamon").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const securityChecksBeforeOpponentAttack = s.events.filter((event) => event.kind === "securityChecked").length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("wall").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.filter((event) => event.kind === "securityChecked").length > securityChecksBeforeOpponentAttack &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    const memoryBeforeThirdDeletion = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("thirdSukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.perm("host").topCard.cardId === "BT6-064");
    await settle();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("mamemon").instanceId);
    expect(s.perm("host").permanentId).toBe(hostId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([
      sourceId,
      s.inst("host").instanceId,
      s.inst("platinum").instanceId,
    ]);
    expect(s.perm("host").stack.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("mamemon").instanceId);
    expect(s.state.memory).toBe(memoryBeforeThirdDeletion - 1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("firstSukamon").instanceId,
        s.inst("secondSukamon").instanceId,
        s.inst("thirdSukamon").instanceId,
      ]),
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
