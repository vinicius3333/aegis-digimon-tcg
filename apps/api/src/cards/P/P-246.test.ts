import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as P_246 } from "./P-246.js";
import "../index.js";

// Fixtures — every one is chosen to be silent on the paths this card walks, so the only
// decision any scenario can open is P-246's own optional digivolve.
//   BT2-052  Hagurumon (Lv.3 Black, 3000 DP, NO printed text at all) — the host carrying the egg.
//   BT2-056  Numemon (Lv.4 Black, 3000 DP, no printed text) — the Lv.4 host for the cost boundary.
//   BT14-034 Sukamon (Lv.4 Yellow/Black, 1000 DP) — the [Sukamon] name subject that is deleted.
//            Its only main clause is [Security]; its [On Deletion] sits in INHERITED text, which
//            a top card does not use (comprehensive §4-23-1), so its deletion is inert.
//   BT6-063  BigMamemon (Lv.5 Black, 10000 DP, no printed text) — the [Mamemon] half of the
//            trigger set, matched by substring, and inert on deletion.
//   BT13-065 PlatinumSukamon (Lv.4 Black, Black Lv.3 cost 2) — the digivolve destination. Its
//            only clause is [On Deletion], which never fires on a digivolve.
//   BT6-064  Mamemon (Lv.5 Black, Black Lv.4 cost 3) — the cost-3 destination used to prove the
//            reduction is exactly 2 (1 memory actually paid). Its clauses are ＜Decoy＞ and
//            [On Deletion]; neither fires when it is digivolved into.
//   BT3-070  Etemon (Lv.5 Black) — the trigger-set discriminator: [Etemon] is a legal
//            DESTINATION name but NOT a triggering deletion.
//   BT1-024  MetalTyrannomon (Lv.5 Red, 10000 DP, no printed text) — an inert non-matching
//            Digimon, used both as a non-triggering deletion and as the opponent's attacker.
//   BT1-080  Titamon (Lv.6 Green, 12000 DP, no printed text) — the inert wall that wins battles.
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
    // A Digi-Egg carries no main text and no Security text.
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

    // 1000 DP into 12000 DP: the attacking Sukamon loses and is deleted.
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

    // The host digivolved; the egg and the old top card are its digivolution cards, bottom first.
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("platinum").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["P-246", "BT2-052"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT13-065");
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-034"]);
    // Printed digivolution cost 2, reduced by 2: nothing is paid.
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

    // 10000 DP into 12000 DP: the attacker is deleted.
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
            // Numemon is Lv.4 Black, so Mamemon's printed "Black Lv.4: Cost 3" requirement is met.
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
      // Etemon's own [On Deletion] is optional; declining it keeps the board readable while
      // P-246's clause is the thing under test.
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    // 6000 DP into 12000 DP: the Etemon is deleted.
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

    // 10000 DP into 1000 DP: seat 0's own Sukamon is deleted, but on the OPPONENT's turn.
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

  it("digivolves only once per turn, however many matching Digimon are deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "host", under: [CARD_ID] },
            { card: "BT14-034", as: "firstSukamon" },
            { card: "BT14-034", as: "secondSukamon" },
          ],
          hand: [
            { card: "BT13-065", as: "platinum" },
            // A legal Lv.4-base destination for the SECOND trigger, so a missing per-turn
            // budget would be observable rather than merely illegal.
            { card: "BT6-064", as: "mamemon" },
          ],
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

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondSukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    // Still PlatinumSukamon: the second deletion found the per-turn use spent.
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("platinum").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("mamemon").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT14-034", "BT14-034"]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });
});
