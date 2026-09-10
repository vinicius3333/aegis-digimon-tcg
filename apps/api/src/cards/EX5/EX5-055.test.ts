import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-055.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-010.js";
import "../BT1/BT1-011.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-021.js";
import "../index.js";

describe("EX5-055 HeavyLeomon", () => {
  it("matches the catalog and encodes Fortitude, deletion, and end-of-attack clauses", () => {
    expect(getCardDefinition("EX5-055")).toMatchObject({
      cardId: "EX5-055",
      nameEn: "HeavyLeomon",
      colors: ["Black", "Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 5 },
        { color: "Green", level: 5, memoryCost: 5 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Machine"],
      effectText: expect.stringContaining("6000 DP or lower"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, names: ["Leomon"], cost: 4, isAlternate: true }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toEqual([
      { keyword: "Fortitude", raw: "＜Fortitude＞" },
    ]);
    for (const trigger of ["WhenDigivolving", "OnDeletion"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        {
          kind: "DeDigivolve",
          amount: 1,
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
        {
          kind: "Return",
          to: "deckBottom",
          target: {
            count: 1,
            filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
          },
        },
      ]);
    }
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          bindResultAs: "endOfAttackReturned",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } } },
        },
        {
          kind: "Unsuspend",
          condition: { kind: "bindingEmpty", ref: "endOfAttackReturned" },
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
        },
      ],
    });
  });

  it("publicly digivolves through the Leomon alternate route and resolves de-digivolve plus bottom-deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-049", as: "base" }],
          hand: [{ card: "EX5-055", as: "heavy" }],
        },
        1: {
          battleArea: [{ card: "BT1-021", as: "target", under: ["BT1-009"] }],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("heavy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-055");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-049"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects the Leomon alternate route from a non-Leomon level-five source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "wrongSource" }], hand: [{ card: "EX5-055", as: "heavy" }] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("heavy").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(4);
    expect(s.perm("wrongSource").topCard?.cardId).toBe("BT1-021");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-055"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the On Deletion de-digivolve and bottom-deck through a public battle", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-055", as: "heavy", suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-021", as: "target", under: ["BT1-009"] },
            { card: "BT1-013", as: "attacker", dp: 14000 },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("heavy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX5-055"));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-013");
    expect(s.state.players[1]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("resolves On Deletion once before public Fortitude replay (Q3648)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-055", as: "heavy", under: ["EX5-049"], suspended: true }] },
        1: {
          battleArea: [
            { card: "BT1-021", as: "target", under: ["BT1-009"] },
            { card: "BT1-013", as: "attacker", dp: 14000 },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const targetPermanentId = s.perm("target").permanentId;
    const targetTopInstanceId = s.perm("target").topCard!.instanceId;
    const targetStackInstanceIds = s.perm("target").stack.map((card) => card.instanceId);
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    s.state.turnSeat = 1;
    await s.ready();
    const sourceInstanceId = s.perm("heavy").topCard!.instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("heavy").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === sourceInstanceId));
    const replayed = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === sourceInstanceId)!;
    expect(replayed.stack).toHaveLength(0);
    // Fortitude replays the deleted HeavyLeomon once; its printed On Deletion still
    // resolves in that original deletion window. Capture the permanent identity before
    // resolution because the target is then de-digivolved and bottom-decked.
    expect(s.state.players[1]!.battleArea.some((perm) => perm.permanentId === targetPermanentId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetTopInstanceId)).toBe(true);
    expect(targetStackInstanceIds).toHaveLength(1);
    expect(s.state.players[1]!.deck.some((card) => targetStackInstanceIds.includes(card.instanceId))).toBe(true);
    expect(s.perm("attacker").topCard?.cardId).toBe("BT1-013");
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("returns exactly a 4000-DP opponent after a public attack and remains suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-055", as: "heavy" }], deck: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "boundary", dp: 4000 },
            { card: "BT1-013", as: "aboveBoundary", dp: 5000 },
          ],
          security: ["BT1-013"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("heavy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-013")).toBe(true);
    expect(s.perm("heavy").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("unsuspends only after a no-target attack, blocks same-turn reuse, and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-055", as: "heavy" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "aboveBoundary", dp: 5000 }],
          security: ["BT1-013", "BT1-013", "BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const attack = async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("heavy").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
    };
    await attack();
    expect(s.perm("heavy").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-013")).toBe(true);
    const triggerCount = () =>
      s.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX5-055").length;
    expect(triggerCount()).toBe(1);

    await attack();
    expect(s.perm("heavy").isSuspended).toBe(true);
    expect(triggerCount()).toBe(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("heavy").isSuspended).toBe(false);
    await attack();
    expect(s.perm("heavy").isSuspended).toBe(false);
    expect(triggerCount()).toBe(2);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
