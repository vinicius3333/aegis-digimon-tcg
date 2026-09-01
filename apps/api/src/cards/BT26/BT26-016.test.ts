import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-016.js";
import "../index.js";

const CARD_ID = "BT26-016";

describe("BT26-016 Chronomon: Holy Mode", () => {
  it("evolves from an off-color Lv.5 TS Digimon for exactly 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-061", as: "tsBase" }],
          hand: [{ card: CARD_ID, as: "holy" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard.cardId === CARD_ID);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tsBase").stack.at(-1)?.cardId).toBe("BT24-061");

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "plainBlue" }],
        hand: [{ card: CARD_ID, as: "holy" }],
      },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBlue").permanentId,
        instanceId: invalid.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("encodes shared once-per-turn delete/recovery triggers and leave replacement", () => {
    expect(compiled.effects).toMatchObject([
      { trigger: "OnPlay", frequency: "OncePerTurn", sharedUseKey: `${CARD_ID}/delete-recover` },
      { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: `${CARD_ID}/delete-recover` },
      { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: `${CARD_ID}/delete-recover` },
      {
        trigger: "AllTurns",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            mode: "prevent",
            sourceFilter: { isSelfRef: true },
            cost: { kind: "return" },
          },
        ],
      },
    ]);
  });

  it("publicly deletes first, returns mixed trash cards, and resolves Recovery +1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "holy" }],
          trash: ["BT1-009", "BT1-010"],
          deck: [{ card: "BT1-011", as: "recovery" }],
        },
        1: {
          battleArea: [
            { card: "BT26-016", as: "boundary", dp: 12000 },
            { card: "BT1-009", as: "overBoundary", dp: 13000 },
          ],
          trash: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("holy").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual([
      s.inst("overBoundary").instanceId,
    ]);
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-011", faceUp: false });
    expect(s.state.players[0]!.deck.length + s.state.players[1]!.deck.length).toBe(3);
    const trashSelection = s.decisions.find(({ req }) => req.kind === "selectCards");
    expect(trashSelection?.seat).toBe(0);
    expect(trashSelection?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([
        s.state.players[0]!.deck[0]!.instanceId,
        s.state.players[0]!.deck[1]!.instanceId,
        s.state.players[1]!.deck[0]!.instanceId,
      ]),
    );
    expect(s.decisions.some(({ seat, req }) => seat === 0 && req.kind === "orderCards")).toBe(true);
  });

  it("resolves the delete/recovery body from a public digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-015", as: "tsBase" }],
          hand: [{ card: CARD_ID, as: "holy" }],
          trash: ["BT1-009", "BT1-010", "BT1-011"],
          deck: [{ card: "BT1-012", as: "recovery" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("holy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("resolves the delete/recovery body from a public attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: ["BT1-009", "BT1-010", "BT1-011"],
          deck: [{ card: "BT1-012", as: "recovery" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 1000 }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("holy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("removes a deleted card from trash before its pending On Deletion can activate (Q6977)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: ["BT1-009"],
          deck: [{ card: "BT1-011", as: "recovery" }],
        },
        1: {
          battleArea: [
            { card: "BT10-008", as: "shoutmon", dp: 1000 },
            { card: "AD1-019", as: "tamer" },
          ],
          trash: ["BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "BT10-008"));

    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT10-008");
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "BT1-011", faceUp: false });
  });

  it("Q6976 does not partially return 2 trash cards or recover when the exact cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: [{ card: "BT1-011", as: "notRecovered" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notRecovered").instanceId]);
  });

  it("may accept the deletion but decline the independent three-card recovery payment", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "holy" }],
        trash: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
          { card: "BT1-011", as: "third" },
        ],
        deck: [{ card: "BT1-012", as: "notRecovered" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 1000 }] },
    });
    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const deleteChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deleteChoice.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const recoveryChoice = s.state.pendingDecision!;
    expect(recoveryChoice.decisionId).not.toBe(deleteChoice.decisionId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: recoveryChoice.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("notRecovered").instanceId]);
  });

  it("shares one use across the On Play and When Attacking windows", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: [
            { card: "BT1-009", as: "firstReturn" },
            { card: "BT1-010", as: "secondReturn" },
            { card: "BT1-011", as: "thirdReturn" },
            "BT1-012",
            "BT1-013",
            "BT1-014",
          ],
          deck: [
            { card: "BT1-015", as: "firstRecovery" },
            { card: "BT1-016", as: "secondRecovery" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstVictim", dp: 1000 },
            { card: "BT1-010", as: "secondVictim", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("firstVictim").permanentId,
      s.inst("firstReturn").instanceId,
      s.inst("secondReturn").instanceId,
      s.inst("thirdReturn").instanceId,
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));
    await settle(() => s.state.players[0]!.security.length === 1);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("holy"), {
      attackerPermanentId: s.perm("holy").permanentId,
    });

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("secondVictim").permanentId,
    ]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("firstRecovery").instanceId,
    ]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("secondRecovery").instanceId);
  });

  it("Q6980 counts a Digi-Egg returned to its Egg Deck toward the three-card recovery cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          trash: [
            { card: "BT26-001", as: "egg" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: [{ card: "BT1-011", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("holy"));
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));

    expect(s.state.players[0]!.eggDeck.map((card) => card.instanceId)).toContain(s.inst("egg").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });

  it("publishes printed Piercing and Engage and spends one security to prevent a real deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy", suspended: true }],
          security: [{ card: "BT1-009", as: "cost" }],
          deck: [{ card: "BT1-010", as: "oldBottom" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 16000 }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect([...s.perm("holy").keywords]).toEqual(expect.arrayContaining(["Piercing", "Engage"]));

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("holy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.deck.at(-1)).toMatchObject({ cardId: "BT1-009", faceUp: false });
  });

  it("uses Piercing to check security after deleting a weaker suspended Digimon in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy" }],
          hand: ["AD1-001"],
          deck: ["BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "defender", dp: 1000, suspended: true }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const defenderId = s.perm("defender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("holy").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === defenderId) &&
        s.state.players[1]!.security.length === 1,
    );

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("uses Engage to make an optional end-of-turn player attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "holy" }] },
        1: {
          security: [
            { card: "BT1-001", as: "firstSecurity" },
            { card: "BT1-002", as: "secondSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    expect(mainPhase.isOpen).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("firstSecurity").instanceId);
  });

  it("may decline the leave replacement without moving security", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "holy", suspended: true }],
          security: [{ card: "BT1-009", as: "security" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 16000 }] },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    declined.state.turnSeat = 1;
    expect(
      declined.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: declined.perm("holy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.events.some(({ kind }) => kind === "combatResolved"));
    expect(declined.state.players[0]!.battleArea).toHaveLength(0);
    expect(declined.state.players[0]!.security).toHaveLength(1);
  });

  it("Q6981 only prevents one leave per turn and blindly returns the top security card", async () => {
    const once = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "holy" }],
        security: [
          { card: "BT1-009", as: "topCost" },
          { card: "BT1-010", as: "bottomSecurity" },
        ],
        deck: [{ card: "BT1-011", as: "oldBottom" }],
      },
    });
    const holyId = once.perm("holy").permanentId;
    const firstDeletion = advance(once.engine).verb.deletePermanent([holyId], "byEffect");
    await settle(() => once.state.pendingDecision?.kind === "optional");
    const choice = once.state.pendingDecision!;
    expect(
      once.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    expect(await firstDeletion).toBe(0);

    expect(once.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(0);
    expect(once.state.players[0]!.deck.at(-1)?.instanceId).toBe(once.inst("topCost").instanceId);
    expect(once.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      once.inst("bottomSecurity").instanceId,
    ]);

    const secondDeletion = advance(once.engine).verb.deletePermanent([holyId], "byEffect");
    await settle(() => once.state.players[0]!.battleArea.length === 0 || once.state.pendingDecision !== undefined);
    if (once.state.pendingDecision !== undefined) {
      const unexpectedChoice = once.state.pendingDecision;
      once.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: unexpectedChoice.decisionId,
        response: { kind: "optional", accept: false },
      });
    }
    expect(await secondDeletion).toBe(1);
    expect(once.state.players[0]!.battleArea).toHaveLength(0);
    expect(once.state.players[0]!.security).toHaveLength(1);
  });
});
