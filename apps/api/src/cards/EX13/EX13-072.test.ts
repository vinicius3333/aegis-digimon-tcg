import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled as EX13_072 } from "./EX13-072.js";
import "../index.js";

const CARD_ID = "EX13-072";

describe("EX13-072 Kota Domoto", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Kota Domoto",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 4,
      dp: 0,
      evoCosts: [],
      types: ["Chronicle"],
    });
  });

  it("maps every printed clause onto IR", () => {
    expect(EX13_072.coverage).toBe("full");
    expect(EX13_072.residual).toEqual([]);
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(EX13_072);

    const gate = EX13_072.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0];
    expect(gate?.kind).toBe("CostGatedBlock");
    if (gate?.kind !== "CostGatedBlock") throw new Error("Start-of-Main action is not a CostGatedBlock");
    expect(gate).toMatchObject({
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }] },
        },
      },
      optional: true,
      abortOnDecline: true,
    });
    expect(gate.actions).toMatchObject([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);

    const watcher = EX13_072.effects.find((effect) => effect.trigger === "YourTurn")?.actions[0];
    expect(watcher?.kind).toBe("SubTrigger");
    if (watcher?.kind !== "SubTrigger") throw new Error("[Your Turn] action is not a SubTrigger");
    expect(watcher).toMatchObject({
      event: "whenAttacking",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Chronicle"], match: "trait" }],
      },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
    });
    expect(watcher.actions).toMatchObject([
      {
        kind: "UseOptionWithoutCost",
        from: ["hand"],
        payCost: true,
        reduceCostBy: 1,
        optional: true,
        filter: {
          controller: "mine",
          kind: ["Option"],
          nameOrTrait: [
            { tokens: ["X Antibody"], match: "nameExact" },
            { tokens: ["Chronicle"], match: "trait" },
          ],
        },
      },
    ]);
    expect(watcher.actions[0]).not.toHaveProperty("waiveColorRequirement");
    expect(watcher.actions[0]).not.toHaveProperty("playCostLte");

    expect(EX13_072.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("trashes a [Chronicle] card from hand for a draw and a memory through a real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [
            { card: "BT20-095", as: "chronicleCard" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    const deckBefore = s.state.players[0]!.deck.length;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chronicleCard").instanceId),
    );
    await settle();
    const memoryAfterGate = s.state.memory;

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("chronicleCard").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("chronicleCard").instanceId);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    expect(memoryAfterGate).toBeGreaterThanOrEqual(1);
  });

  it("gains exactly 1 memory and draws exactly 1 when the cost is paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [
            { card: "BT20-095", as: "chronicleCard" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kota"));
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("chronicleCard").instanceId),
    );
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("spare").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("declining the cost trashes nothing, draws nothing and gains no memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [
            { card: "BT20-095", as: "chronicleCard" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 2;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kota"));
    await settle();

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("chronicleCard").instanceId,
      s.inst("spare").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the sibling [X Antibody] trait: the trash cost is exact-[Chronicle] only", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [
            { card: "BT9-104", as: "xAntibodyOption" },
            { card: "BT13-063", as: "xAntibodyDigimon" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    const deckBefore = s.state.players[0]!.deck.length;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kota"));
    await settle();

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("xAntibodyOption").instanceId,
      s.inst("xAntibodyDigimon").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [{ card: "BT20-095", as: "chronicleCard" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.length;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle();

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("chronicleCard").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("suspends itself and uses a [Chronicle] Option for 1 less than its printed cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle();

    expect(s.perm("kota").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("option").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q7451: two Kotas can't combine their reductions on one Option card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "firstKota" },
            { card: CARD_ID, as: "secondKota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle();

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.filter((card) => card.instanceId === s.inst("option").instanceId)).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses the exactly-named [X Antibody] Option through the name branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [{ card: "BT9-109", as: "xAntibody" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("xAntibody").instanceId));
    await settle();

    expect(s.perm("kota").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("xAntibody").instanceId);
  });

  it("rejects a sibling-trait and an unrelated Option: neither branch matches, so nothing is used", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [
            { card: "BT9-104", as: "traitNearMiss" },
            { card: "BT2-103", as: "unrelated" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("traitNearMiss").instanceId,
      s.inst("unrelated").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("kota").isSuspended).toBe(true);
  });

  it("declining leaves the Tamer unsuspended, the Option in hand and memory untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT20-051", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.perm("kota").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("ignores an attacker carrying only the sibling [X Antibody] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT13-063", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.perm("kota").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("ignores a wholly unrelated attacker", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "kota" },
            { card: "BT1-013", as: "attacker" },
          ],
          hand: [{ card: "P-204", as: "option" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: { security: ["BT1-011"], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.perm("kota").isSuspended).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);
  });

  it("ignores the OPPONENT's [Chronicle] Digimon attacking — the clause reads 'your'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "kota" }],
          hand: [{ card: "P-204", as: "option" }],
          security: ["BT1-011"],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT20-051", as: "attacker" }],
          hand: [{ card: "BT1-009", as: "spare" }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 150);

    expect(s.perm("kota").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("option").instanceId]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: CARD_ID, as: "security", faceUp: true }], deck: ["BT1-011", "BT1-012"] },
    });
    await s.ready();
    s.state.memory = 0;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));
    await settle();

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === CARD_ID);
    expect(played?.topCard?.instanceId).toBe(s.inst("security").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("security").instanceId);
  });
});
