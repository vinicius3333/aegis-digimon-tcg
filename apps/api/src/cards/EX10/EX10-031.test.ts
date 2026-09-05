import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registerIrCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
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
        // One selection, two consequences. `GrantStatic.selectionRef` and an action-level
        // `ModifyDP.fromSelectionRef` are both unread by the interpreter, so the earlier shape
        // ran a second independent target search for the DP buff.
        actions: [
          {
            kind: "SelectBind",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "protected" },
          },
          {
            kind: "Restrict",
            restriction: "cantBeDeDigivolved",
            byOpponentEffectsOnly: true,
            duration: "untilOpponentTurnEnd",
            target: { filter: {}, count: 1, fromSelectionRef: "protected" },
          },
          {
            kind: "ModifyDP",
            amount: 3000,
            duration: "untilOpponentTurnEnd",
            target: { filter: {}, count: 1, fromSelectionRef: "protected" },
          },
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
                filter: {
                  controller: "mine",
                  kind: ["Digimon", "Tamer", "Option"],
                  playCostLte: 4,
                  // "from ITS digivolution cards" — not any controlled Digimon's stack.
                  hostFilter: { isSelfRef: true },
                },
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
    const otherBaseDp = s.perm("other").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("chosen").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "cantBeDeDigivolved")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "cantBeDeDigivolved")).toBe(false);
    expect(s.perm("other").currentDP).toBe(otherBaseDp);
    // The protection and the DP share ONE choice: exactly one target decision is raised for the
    // whole clause. A second, independent ModifyDP selection (the pre-fix shape) shows up here.
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets" || req.kind === "selectCards")).toHaveLength(1);
    s.state.turnSeat = 1;
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 1);
    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("chosen").currentDP).toBe(baseDp);
  });

  it("blocks opposing De-Digivolve but allows the controller's own effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX10-028", as: "protected", under: ["BT1-009"] },
            { card: "EX10-028", as: "unprotected", under: ["BT1-009"] },
          ],
        },
        1: {
          battleArea: [{ card: "BT19-073", as: "opponentSource", under: ["BT19-070"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    expect(observe(s.engine).isRestrictedByEffect(s.perm("protected"), "cantBeDeDigivolved", "Digimon")).toBe(true);
    expect(
      advance(s.engine).ledgers.continuous.hasRestriction(
        s.perm("protected").permanentId,
        "cantBeDeDigivolved",
        undefined,
        {
          byOpponentEffect: false,
        },
      ),
    ).toBe(false);

    // Aim the opponent's real De-Digivolve at the protected stack first. This is the
    // controller-scope assertion: the effect attempts the selected target, but cannot peel it.
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("opponentSource"));
    expect(s.perm("protected").stack).toHaveLength(1);

    // The same opponent effect succeeds against a level-4 control without the protection.
    preferred.length = 0;
    preferred.push(s.perm("unprotected").permanentId);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("opponentSource"));
    expect(s.perm("unprotected").stack).toHaveLength(0);

    // No printed EX10 card in this range De-Digivolves one of its own Digimon. Add the smallest
    // neutral IR mechanism to the already-registered EX10-031 record so the production
    // primitive receives the controller's seat, then remove it immediately after this proof.
    const ownEffect = {
      trigger: "WhenDigivolving" as const,
      actions: [
        {
          kind: "DeDigivolve" as const,
          target: { filter: { controller: "mine" as const, kind: ["Digimon" as const] }, count: 1 as const },
          amount: 1,
        },
      ],
    };
    const originalRuntime = runtimeCompiledCard(CARD_ID)!;
    registerIrCard(CARD_ID, { ...originalRuntime, effects: [...originalRuntime.effects, ownEffect] });
    try {
      preferred.length = 0;
      preferred.push(s.perm("protected").permanentId);
      await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
      expect(s.perm("protected").stack).toHaveLength(0);
    } finally {
      registerIrCard(CARD_ID, originalRuntime);
    }
  });

  it("plays only a cost-4-or-lower source from ITS OWN stack for free when leaving, then leaves", async () => {
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
            // A second Digimon holding an equally cheap source. "from ITS digivolution cards"
            // must not reach another Digimon's stack, so this card stays put even though the
            // selection prefers it.
            { card: "BT21-009", as: "bystander", under: [{ card: "EX10-027", as: "elsewhere" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("elsewhere").instanceId, s.inst("tooExpensive").instanceId, s.inst("eligible").instanceId);
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
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.instanceId)).not.toContain(
      s.inst("elsewhere").instanceId,
    );
    expect(s.perm("bystander").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("elsewhere").instanceId);
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
