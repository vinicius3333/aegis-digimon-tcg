import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-022.js";
import "../index.js";

const CARD_ID = "EX10-022";

function triggerKeysOf(payloadJson: string): string[] {
  return (JSON.parse(payloadJson) as { triggerKeys: string[] }).triggerKeys;
}

describe("EX10-022 Belphemon: Rage Mode", () => {
  it("records the compiled contract for every printed clause", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Belphemon: Sleep Mode"], cost: 1, isAlternate: true },
    ]);
    expect(
      compiled.effects?.find(
        (effect) => effect.trigger === "StartOfYourMainPhase" && effect.actions[0]?.kind === "Suspend",
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: "all",
          },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Piercing" },
          duration: "forTheTurn",
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 6 },
        },
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 2 }, duration: "forTheTurn" },
        { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" },
      ],
    });
    for (const trigger of ["StartOfYourMainPhase", "OnPlay", "WhenDigivolving"]) {
      expect(
        compiled.effects?.find((effect) => effect.trigger === trigger && effect.actions[0]?.kind === "Delete"),
      ).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon", "Tamer"] }, count: 1 },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 1,
          fromTop: true,
          condition: {
            kind: "selfTopHasText",
            filter: { nameOrTrait: [{ tokens: ["Belphemon: Sleep Mode"], match: "name" }] },
          },
        },
      ],
    });
  });

  it("matches the catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Belphemon: Rage Mode",
      colors: ["Green", "Purple"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 14,
      dp: 14000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 6 },
        { color: "Purple", level: 5, memoryCost: 6 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
    });
  });

  it.each([
    ["AD1-011", 6],
    ["BT10-081", 6],
    ["EX10-021", 1],
  ] as const)(
    "digivolves from %s for %i memory and its [When Digivolving] deletes 1 suspended opponent card",
    async (baseCard, cost) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: baseCard, as: "base" }],
            hand: [{ card: CARD_ID, as: "rage" }],
            deck: ["BT1-013", "BT1-014"],
          },
          1: {
            battleArea: [
              { card: "BT1-009", as: "suspended", suspended: true },
              { card: "BT1-013", as: "standing" },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = cost;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("rage").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

      expect(s.perm("base").topCard!.cardId).toBe(CARD_ID);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
      expect(s.state.memory).toBe(0);
      // Digivolving draws 1.
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard!.instanceId)).toEqual([
        s.inst("standing").instanceId,
      ]);
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("suspended").instanceId]);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it("refuses an illegal source: a Lv.4 Digimon meets neither the Lv.5 nor the Sleep Mode route", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-071", as: "base" }], hand: [{ card: CARD_ID, as: "rage" }], deck: ["BT1-013"] },
    });
    await s.ready();
    s.state.memory = 6;

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("rage").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("base").topCard!.cardId).toBe("BT1-071");
    expect(s.state.memory).toBe(6);
  });

  it("the Sleep Mode route is name-exact: another Lv.6 [Belphemon] host is refused", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "base" }], hand: [{ card: CARD_ID, as: "rage" }], deck: ["BT1-013"] },
    });
    await s.ready();
    s.state.memory = 6;

    // "[Belphemon: Rage Mode]" shares the "Belphemon" prefix with the named requirement but is
    // not the exact name, and Lv.6 fails the printed Lv.5 routes.
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("rage").instanceId,
    });
    expect(result.ok).toBe(false);
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.memory).toBe(6);
  });

  it("[On Play] from hand deletes 1 suspended opponent Digimon or Tamer and leaves standing cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: CARD_ID, as: "rage" }], deck: ["BT1-013"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "digimon", suspended: true },
            { card: "BT1-085", as: "tamer", suspended: true },
            { card: "BT1-013", as: "standing" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("tamer").topCard!.instanceId, s.perm("standing").topCard!.instanceId);
    s.state.memory = 14;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rage").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard!.instanceId)).toEqual([
      s.inst("digimon").instanceId,
      s.inst("standing").instanceId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("tamer").instanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q5072: both [Start of Your Main Phase] effects are simultaneous and the controller orders them (suspend first)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rage" }],
          hand: ["BT1-013", "BT1-014", "BT1-009", "BT1-071", "BT1-012", "BT1-014"],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-071", as: "low4" },
            { card: "BT10-081", as: "low5" },
            { card: "BT12-057", as: "high7", suspended: true },
          ],
          deck: ["BT1-013"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: false, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("low4").topCard!.instanceId);
    const baseDp = s.perm("rage").currentDP;

    // The already-suspended Lv.7 makes the Delete clause activatable at the same instant as
    // the Suspend clause, so both compete for the next slot and the controller is asked.
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const decision = s.state.pendingDecision!;
    const keys = triggerKeysOf(decision.payloadJson);
    expect(keys).toHaveLength(2);
    const suspendKey = keys.find((key) => key.endsWith("-0"))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderTriggers", order: [suspendKey] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    // Hand is 6 (no draw on the opening turn), so the whole conditional buff applies.
    expect(s.state.players[0]!.hand).toHaveLength(6);
    // Suspend resolved first, so the Lv.4 was a legal delete target and was chosen.
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("low4").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard!.instanceId)).toEqual([
      s.inst("low5").instanceId,
      s.inst("high7").instanceId,
    ]);
    expect(s.perm("low5").isSuspended).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("rage"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("rage"), "SecurityAttack")).toBe(2);
    expect(s.perm("rage").currentDP).toBe(baseDp + 3000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5072: choosing the delete first limits it to the already-suspended Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rage" }],
          hand: ["BT1-013", "BT1-014", "BT1-009", "BT1-071", "BT1-012", "BT1-014"],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-071", as: "low4" },
            { card: "BT12-057", as: "high7", suspended: true },
          ],
          deck: ["BT1-013"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const decision = s.state.pendingDecision!;
    const keys = triggerKeysOf(decision.payloadJson);
    const deleteKey = keys.find((key) => key.endsWith("-1"))!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderTriggers", order: [deleteKey] },
      }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    // The Lv.4 was still standing when the delete resolved, so only the Lv.7 could be taken;
    // the suspend clause then resolved and suspended the survivor.
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("high7").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard!.instanceId)).toEqual([
      s.inst("low4").instanceId,
    ]);
    expect(s.perm("low4").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("with 7 cards in hand the start-of-main suspend still happens but none of the buffs apply", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rage" }],
          hand: ["BT1-013", "BT1-014", "BT1-009", "BT1-071", "BT1-012", "BT1-014", "BT1-013"],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-071", as: "low4" }],
          breeding: { card: "BT1-009", as: "raising" },
          deck: ["BT1-013"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const baseDp = s.perm("rage").currentDP;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(7);
    // The suspend clause armed the delete clause, which then took the newly suspended Lv.4.
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("low4").instanceId]);
    // The raising-area Lv.3 is neither suspended nor deleted: both clauses target the battle area.
    expect(s.state.players[1]!.breeding!.isSuspended).toBe(false);
    expect(s.state.players[1]!.breeding!.topCard!.instanceId).toBe(s.inst("raising").instanceId);
    expect(observe(s.engine).hasPierce(s.perm("rage"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("rage"), "SecurityAttack")).toBe(0);
    expect(s.perm("rage").currentDP).toBe(baseDp);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("the granted ＜Piercing＞ and ＜Security Attack +2＞ change a real attack: 3 security checked", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rage" }],
          hand: ["BT1-013", "BT1-014", "BT1-009", "BT1-071", "BT1-012", "BT1-014"],
          deck: ["BT1-013", "BT1-014"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-071", as: "victim", suspended: true },
            { card: "BT1-071", as: "blocked" },
          ],
          deck: ["BT1-013"],
          security: ["BT1-009", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("blocked").topCard!.instanceId);

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);
    // The already-suspended Lv.4 survived: the delete took the other one.
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("blocked").instanceId]);
    expect(s.perm("rage").currentDP).toBe(17_000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rage").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.pendingDecision === undefined);

    // ＜Piercing＞ pushed the attack through to security after the battle deletion, and
    // ＜Security Attack +2＞ made it check 3 cards instead of 1.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard!.cardId)).toEqual([CARD_ID]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5073: under a Sleep Mode host the inherited clause mandatorily trashes the top stacked card at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-021",
              as: "sleep",
              under: [
                { card: "BT10-081", as: "bottom" },
                { card: CARD_ID, as: "rageSource" },
              ],
            },
          ],
          deck: ["BT1-013", "BT1-014"],
          hand: ["BT1-013"],
          security: ["BT1-009"],
        },
        1: { deck: ["BT1-013", "BT1-014"], hand: ["BT1-013"], security: ["BT1-009"] },
      },
      // No optional prompt may gate this: the ruling makes the trash mandatory whenever possible.
      { autoDeclineOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("sleep").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottom").instanceId,
      s.inst("rageSource").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("rageSource").instanceId]);
    expect(s.perm("sleep").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("bottom").instanceId]);
    expect(s.perm("sleep").topCard!.cardId).toBe("EX10-021");
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("the gate reads the host's NAME: a Rage Mode host keeps its stack at the end of the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: CARD_ID,
            as: "host",
            under: [
              { card: "BT10-081", as: "bottom" },
              { card: CARD_ID, as: "rageSource" },
            ],
          },
        ],
        deck: ["BT1-013", "BT1-014"],
        hand: ["BT1-013"],
        security: ["BT1-009"],
      },
      1: { deck: ["BT1-013", "BT1-014"], hand: ["BT1-013"], security: ["BT1-009"] },
    });
    await s.ready();
    s.state.turnSeat = 1;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // EX10-022's own printed text names "[Belphemon: Sleep Mode]" in its [Digivolve] line, so a
    // `match: "text"` gate would wrongly fire on this host.
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("bottom").instanceId,
      s.inst("rageSource").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("＜Fortitude＞ replays this Digimon when a real battle deletes it while it has digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rage", suspended: true, under: [{ card: "BT10-081", as: "source" }] }],
          deck: ["BT1-013"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }], deck: ["BT1-013"], security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const rageCardId = s.inst("rage").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("rage").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard!.instanceId === rageCardId) &&
        s.state.pendingDecision === undefined,
    );

    // Replayed by Fortitude: back on the battle area, with an empty stack, and the
    // digivolution card it carried is in the trash.
    const replayed = s.state.players[0]!.battleArea.find(({ topCard }) => topCard!.instanceId === rageCardId)!;
    expect(replayed.stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("source").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
