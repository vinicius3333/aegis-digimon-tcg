import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-096.js";

/**
 * Comet Hammer's ＜De-Digivolve 4＞ never strips a stack to nothing: CR §16-12-4 stops the peel
 * once a level-3 card is the top. This stack is built so the floor is reached on the 4th peel —
 * level 6 -> 5 -> 4 -> level 3 Elizamon — leaving the hatched Digi-Egg untouched beneath it.
 */
const LEVEL_FLOOR_STACK = [
  { card: "BT23-001", as: "stackEgg" },
  { card: "BT23-005", as: "stackLevel3" },
  { card: "BT23-010", as: "stackLevel4" },
  { card: "BT23-012", as: "stackLevel5" },
];

describe("BT23-096 Comet Hammer", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-096")).toMatchObject({
      cardId: "BT23-096",
      nameEn: "Comet Hammer",
      colors: ["Black"],
      kinds: ["Option"],
      playCost: 5,
      types: ["CS"],
      effectText:
        "While you have a Digimon or Tamer with the [CS]\u00a0trait on the field, you can ignore this card's color requirements.\n[Main] ＜De-Digivolve 4＞ 1 of your opponent's Digimon. Then, place this card in the battle area.\n[Your Turn] When one of your [CS]\u00a0trait Digimon attacks, ＜Delay＞ \n・＜De-Digivolve 4＞ 1 of your opponent's Digimon.",
      securityEffectText:
        "[Security] ＜De-Digivolve 4＞ 1 of your opponent's Digimon. Then, place this card in the battle area.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);

    const waiver = (compiled.effects.find((effect) => effect.trigger === "Static") as any).actions[0];
    // Q5384: "on the field" is the battle area OR the breeding area.
    expect(waiver.condition.filter.zone).toEqual(["battleArea", "breeding"]);
    expect(waiver.condition.filter.kind).toEqual(["Digimon", "Tamer"]);
    expect(waiver.condition.filter.controllerDefault).toBe("mine");
    // CR §2-3-2-3: "with the [CS] trait" is exact trait matching, not `traitContains`.
    expect(waiver.condition.filter.nameOrTrait).toEqual([{ tokens: ["CS"], match: "trait" }]);

    // Every ＜De-Digivolve 4＞ on this card targets exactly 1 of the OPPONENT's Digimon.
    const deDigivolves = compiled.effects.flatMap((effect) =>
      effect.actions.flatMap((action: any) => (action.kind === "SubTrigger" ? action.actions : [action])),
    ) as any[];
    const peels = deDigivolves.filter((action) => action.kind === "DeDigivolve");
    expect(peels).toHaveLength(3);
    for (const peel of peels) {
      expect(peel).toMatchObject({
        amount: 4,
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      });
    }
  });

  it("keeps the Main and Security de-digivolve-then-place sequences", () => {
    const main = compiled.effects.find((effect) => effect.trigger === "Main" && !effect.keywords) as any;
    const security = compiled.effects.find((effect) => effect.trigger === "Security") as any;
    expect(main.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(security.actions).toMatchObject([{ kind: "DeDigivolve", amount: 4 }, { kind: "PlaceInBattleAreaSelf" }]);
    expect(security.isSecurity).toBe(true);

    const turn = compiled.effects.find((effect) => effect.trigger === "YourTurn") as any;
    expect(turn.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(turn.actions).toHaveLength(1);
    expect(turn.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
    });
  });

  it("waives the black color requirement from an off-color CS Digimon in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT22-008", as: "csInBreeding" },
          hand: [{ card: "BT23-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("waives the color requirement from a CS Tamer in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-078", as: "csTamer" }],
          hand: [{ card: "BT23-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("refuses the play when the only card on the field is off-color and lacks the [CS] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "redNonCs" }],
          hand: [{ card: "BT23-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toMatchObject({ ok: false });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(5);
  });

  it("plays for 5, de-digivolves the opposing stack to the level-3 floor and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          // Black, non-CS: the colour requirement is met on its own, so this proves the [Main]
          // payload rather than the waiver.
          battleArea: [{ card: "BT2-052", as: "blackSource" }],
          hand: [{ card: "BT23-096", as: "option" }],
        },
        1: { battleArea: [{ card: "BT23-015", as: "target", under: LEVEL_FLOOR_STACK }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const optionId = s.inst("option").instanceId;
    const topId = s.perm("target").topCard!.instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));

    expect(s.state.memory).toBe(0);
    const placed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === optionId);
    expect(placed).toBeDefined();
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    // Peels stop at the level-3 card (CR §16-12-4): 3 cards trashed, the Digi-Egg stays under it.
    expect(s.perm("target").topCard?.instanceId).toBe(s.inst("stackLevel3").instanceId);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("stackEgg").instanceId]);
    const opponentTrash = s.state.players[1]!.trash.map((card) => card.instanceId);
    expect(opponentTrash).toContain(topId);
    expect(opponentTrash).toContain(s.inst("stackLevel5").instanceId);
    expect(opponentTrash).toContain(s.inst("stackLevel4").instanceId);
    expect(opponentTrash).not.toContain(s.inst("stackLevel3").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("cannot pay ＜Delay＞ the turn it is placed and can on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-052", as: "blackSource" },
            // A high-DP CS attacker so the security battles it wins do not remove it before the
            // second turn; the printed DP is irrelevant to the ＜Delay＞ arming filter.
            { card: "BT23-006", as: "csAttacker", dp: 15000 },
          ],
          hand: [{ card: "BT23-096", as: "option" }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT23-015", as: "target", under: LEVEL_FLOOR_STACK }],
          security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    const placed = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === optionId)!;
    expect(placed.enterFieldTurnCount).toBe(s.state.turnCount);

    // CR §16-17-3: ＜Delay＞ can't be activated the turn its card entered the battle area.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("csAttacker").isSuspended);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("csAttacker").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("csAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    // The ＜Delay＞ cost is trashing the card itself (CR §16-17-1).
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(false);
    expect(s.perm("target").topCard?.instanceId).toBe(s.inst("stackLevel3").instanceId);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("pays Delay and de-digivolves up to four cards from a realistic opposing stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-096", as: "option" },
            { card: "BT23-006", as: "attacker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-015", as: "target", under: LEVEL_FLOOR_STACK }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const topId = s.perm("target").topCard!.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.perm("target").topCard?.instanceId).toBe(s.inst("stackLevel3").instanceId);
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([s.inst("stackEgg").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(topId);
  });

  it("de-digivolves only the opponent's Digimon, never your own", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-096", as: "option" },
            { card: "BT23-006", as: "attacker" },
            { card: "BT23-015", as: "ownStack", under: [{ card: "BT23-012", as: "ownUnder" }] },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-015", as: "target", under: LEVEL_FLOOR_STACK }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const ownTopId = s.perm("ownStack").topCard!.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));
    expect(s.perm("ownStack").topCard?.instanceId).toBe(ownTopId);
    expect(s.perm("ownStack").stack.map((card) => card.instanceId)).toEqual([s.inst("ownUnder").instanceId]);
    expect(s.perm("target").topCard?.instanceId).toBe(s.inst("stackLevel3").instanceId);
  });

  it("does not pay Delay when a non-CS Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-096", as: "option" },
            { card: "BT1-009", as: "attacker" },
          ],
        },
        1: {
          battleArea: [{ card: "BT23-015", as: "target", under: LEVEL_FLOOR_STACK, suspended: false }],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.perm("option").topCard!.instanceId;
    const targetId = s.perm("target").topCard!.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.perm("target").topCard?.instanceId).toBe(targetId);
    expect(s.perm("target").stack).toHaveLength(4);
  });

  it("resolves from security, de-digivolves the attacker and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-015", as: "attacker", under: LEVEL_FLOOR_STACK }] },
        1: { security: [{ card: "BT23-096", as: "securityOption" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const securityOptionId = s.inst("securityOption").instanceId;
    const attackerTopId = s.perm("attacker").topCard!.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === securityOptionId),
    );
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === securityOptionId)).toBe(
      true,
    );
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityOptionId)).toBe(false);
    expect(s.perm("attacker").topCard?.instanceId).toBe(s.inst("stackLevel3").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(attackerTopId);
  });
});
