import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-031.js";
import "../index.js";

const CARD_ID = "EX10-031";

describe("EX10-031 DarkKnightmon", () => {
  it("records the exact catalog and alternate Knightmon-text evolution route", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black", "Purple"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Purple", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Dark Knight", "Bagra Army", "Twilight"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, texts: ["Knightmon"], cost: 4, isAlternate: true }]);
  });

  it("proves shared target protection/DP, leave replacement, inherited redirect, and DigiXros", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }], count: 1 },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GrantStatic",
            selectionRef: "protected",
            grant: { kind: "Protection", protections: ["deDigivolve"], from: "opponent" },
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          },
          { kind: "ModifyDP", fromSelectionRef: "protected", amount: 3000, duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns" && !effect.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              target: {
                filter: { controller: "mine", kind: ["Digimon", "Tamer", "Option"], playCostLte: 4 },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            { kind: "RedirectAttack", optional: true, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          ],
        },
      ],
    });
  });

  it("binds protection and +3000 DP to the same selected Digimon through the opponent turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "BT21-009", as: "chosen" },
            { card: "BT1-009", as: "other" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();
    const baseDp = s.perm("chosen").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("chosen").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "cantBeDeDigivolved")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "cantBeDeDigivolved")).toBe(false);
    s.state.turnSeat = 1;
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 1);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("chosen").currentDP).toBe(baseDp);
  });

  it("plays only a cost-4-or-lower source for free when leaving, then leaves", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "darkKnight",
              under: [
                { card: "EX10-026", as: "eligible" },
                { card: "BT1-019", as: "tooExpensive" },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("tooExpensive").instanceId, s.inst("eligible").instanceId);
    await s.ready();
    const sourceId = s.perm("darkKnight").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([sourceId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("eligible").instanceId),
    );
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(sourceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("tooExpensive").instanceId,
    );
  });

  it("redirects an opposing player attack to the realistic inherited host once", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-019", as: "host", dp: 12000, under: [{ card: CARD_ID, as: "source" }] }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 4000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === attackerId));
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("host").permanentId);
  });

  it("DigiXroses with SkullKnightmon and DeadlyAxemon for 2 less and rejects a wrong slot", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "darkKnight" },
            { card: "EX10-026", as: "skull" },
            { card: "EX10-027", as: "deadly" },
            { card: "BT1-009", as: "wrong" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnight").instanceId,
        digiXros: { materialInstanceIds: [s.inst("skull").instanceId, s.inst("wrong").instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnight").instanceId,
        digiXros: { materialInstanceIds: [s.inst("skull").instanceId, s.inst("deadly").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === CARD_ID)!;
    expect(s.state.memory).toBe(2);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("skull").instanceId, s.inst("deadly").instanceId]),
    );
  });
});
