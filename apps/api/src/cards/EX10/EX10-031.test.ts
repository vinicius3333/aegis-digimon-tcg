import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registerIrCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX10-031.js";
import "../index.js";

const CARD_ID = "EX10-031";
/** Lv.4 Black bases for the "Lv.4 w/[Knightmon] in text" route (KB Q5090). */
const KNIGHTMON_BY_NAME = "EX10-026"; // SkullKnightmon: the token is in the NAME
const KNIGHTMON_BY_EFFECT = "EX10-027"; // DeadlyAxemon: the token is only in the EFFECT TEXT
const NO_KNIGHTMON_LV4 = "EX10-028"; // Landramon: Black Lv.4, no Knightmon anywhere
/** EX8-049 Golemon: "[On Play] ＜De-Digivolve1＞ 1 of your opponent's Digimon" — a public route. */
const OPPONENT_DEDIGIVOLVE = "EX8-049";

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

  // --- [On Play]: one selection, two consequences, through the public play intent ----------

  it("[On Play] played from hand for 7: protection and +3000 DP land on the SAME chosen Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkKnight" }],
          battleArea: [
            { card: "BT21-009", as: "chosen" },
            { card: "BT1-009", as: "other" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard!.instanceId);
    await s.ready();
    s.state.memory = 7;
    const baseDp = s.perm("chosen").currentDP;
    const otherBaseDp = s.perm("other").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chosen").currentDP === baseDp + 3000);

    // Play cost paid in full; the played Digimon is a real board permanent.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard!.cardId)).toContain(CARD_ID);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    expect(s.perm("chosen").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "cantBeDeDigivolved")).toBe(true);
    expect(s.perm("other").currentDP).toBe(otherBaseDp);
    expect(observe(s.engine).isRestricted(s.perm("other"), "cantBeDeDigivolved")).toBe(false);
    // The protection and the DP share ONE choice: exactly one target decision for the whole
    // clause. A second, independent ModifyDP selection (the pre-fix shape) shows up here.
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets" || req.kind === "selectCards")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("[On Play] the buff survives into the opponent's turn and expires when that turn ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkKnight" }, "BT1-013"],
          battleArea: [{ card: "BT21-009", as: "chosen" }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          hand: ["BT1-013"],
          battleArea: [{ card: "BT1-009", as: "theirs", dp: 20_000 }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard!.instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 7;
    const baseDp = s.perm("chosen").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chosen").currentDP === baseDp + 3000);

    // My own turn ends: "until your OPPONENT's turn ends" must outlive it.
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("chosen").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "cantBeDeDigivolved")).toBe(true);

    // The opponent's turn ends: both consequences are gone by my next Main.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("chosen").currentDP).toBe(baseDp);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "cantBeDeDigivolved")).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- Alternate evolution route + KB Q5090 ("[X] in its text") ---------------------------

  it.each([
    ["the token in its NAME (SkullKnightmon)", KNIGHTMON_BY_NAME],
    ["the token only in its EFFECT TEXT (DeadlyAxemon)", KNIGHTMON_BY_EFFECT],
  ])("[Digivolve] Lv.4 w/[Knightmon] in text costs 4 from a base with %s (Q5090)", async (_label, base) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkKnight" }],
          battleArea: [{ card: base, as: "base" }],
          deck: [{ card: "BT1-013", as: "drawn" }, "BT1-014"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").topCard!.instanceId);
    await s.ready();
    s.state.memory = 4;
    const baseInstanceId = s.perm("base").topCard!.instanceId;
    const permanentId = s.perm("base").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("darkKnight").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);

    // Cost 4, not the printed 4-per-colour evo cost route's own price; source identity kept.
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").permanentId).toBe(permanentId);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseInstanceId]);
    // The digivolution bonus draw: the hand card spent, replaced by the top of the deck.
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    // [When Digivolving] fired on the real route: the new top has the +3000 DP on itself.
    expect(s.perm("base").currentDP).toBe(getCardDefinition(CARD_ID)!.dp + 3000);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved")).toBe(true);
  });

  it("[Digivolve] refuses the Cost 4 route from a Lv.4 with no [Knightmon] anywhere in its text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkKnight" }],
          battleArea: [{ card: NO_KNIGHTMON_LV4, as: "base" }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const baseInstanceId = s.perm("base").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("darkKnight").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(4);
    expect(s.perm("base").topCard!.instanceId).toBe(baseInstanceId);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
  });

  it("an opposing ＜De-Digivolve＞ played publicly cannot peel the protected Lv.4 stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkKnight" }],
          battleArea: [
            { card: NO_KNIGHTMON_LV4, as: "protected", under: [{ card: "BT1-009", as: "protectedBase" }] },
            { card: NO_KNIGHTMON_LV4, as: "unprotected", under: [{ card: "BT1-009", as: "unprotectedBase" }] },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: {
          hand: [
            { card: OPPONENT_DEDIGIVOLVE, as: "peelAtProtected" },
            { card: OPPONENT_DEDIGIVOLVE, as: "peelAtUnprotected" },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").topCard!.instanceId);
    await s.ready();
    s.state.memory = 7;

    // The clause is installed by the public [On Play], not by injected timing.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "cantBeDeDigivolved"));

    // Hand the turn to the opponent so their own De-Digivolve card is publicly playable.
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    // Aimed at the protected Lv.4 top: the effect resolves, but nothing is peeled.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("peelAtProtected").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    expect(s.perm("protected").topCard!.cardId).toBe(NO_KNIGHTMON_LV4);
    expect(s.perm("protected").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("protectedBase").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);

    // The same printed card, aimed at an identical unprotected Lv.4 top, peels it to Lv.3.
    preferred.length = 0;
    preferred.push(s.perm("unprotected").topCard!.instanceId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("peelAtUnprotected").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("unprotected").stack.length === 0);
    expect(s.perm("unprotected").topCard!.instanceId).toBe(s.inst("unprotectedBase").instanceId);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([NO_KNIGHTMON_LV4]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("control: with the protection placed elsewhere, the same opposing card peels that stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkKnight" }],
          battleArea: [
            { card: NO_KNIGHTMON_LV4, as: "aimed", under: [{ card: "BT1-009", as: "aimedBase" }] },
            { card: NO_KNIGHTMON_LV4, as: "decoy", under: ["BT1-009"] },
          ],
          deck: ["BT1-013", "BT1-014"],
        },
        1: { hand: [{ card: OPPONENT_DEDIGIVOLVE, as: "peel" }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // The protection goes on the DECOY, so the stack the opponent aims at is unprotected.
    preferred.push(s.perm("decoy").topCard!.instanceId);
    await s.ready();
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("decoy"), "cantBeDeDigivolved"));
    expect(observe(s.engine).isRestricted(s.perm("aimed"), "cantBeDeDigivolved")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    preferred.length = 0;
    preferred.push(s.perm("aimed").topCard!.instanceId);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("peel").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("aimed").stack.length === 0);
    // Same fixture, same aim, protection moved: the peel lands. Step 1 of the previous test
    // therefore failed to peel because of the restriction, not because the aim went elsewhere.
    expect(s.perm("aimed").topCard!.instanceId).toBe(s.inst("aimedBase").instanceId);
    expect(s.perm("decoy").stack).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the controller's OWN ＜De-Digivolve＞ free to peel the protected Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "darkKnight" }],
          battleArea: [{ card: NO_KNIGHTMON_LV4, as: "protected", under: ["BT1-009"] }],
          deck: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").topCard!.instanceId);
    await s.ready();
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "cantBeDeDigivolved"));

    // No printed card De-Digivolves one of ITS OWN controller's Digimon, so the "their
    // ＜De-Digivolve＞ effects" scope has no public route. Add the smallest neutral IR mechanism
    // to the registered EX10-031 record so the production primitive receives the controller's
    // seat, then remove it immediately. Injected timing: structural evidence only.
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
      const source = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;
      await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, source);
      expect(s.perm("protected").stack).toHaveLength(0);
    } finally {
      registerIrCard(CARD_ID, originalRuntime);
    }
  });

  // --- [All Turns] would-leave replacement, driven by a real battle loss ------------------

  it("on a real battle loss, plays a cost-4-or-lower card from ITS OWN stack for free", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: CARD_ID,
              as: "darkKnight",
              under: [
                { card: KNIGHTMON_BY_NAME, as: "eligible" },
                { card: "BT1-019", as: "tooExpensive" },
              ],
            },
            // A second Digimon holding an equally cheap source. "from ITS digivolution cards"
            // must not reach another Digimon's stack, so this card stays put even though the
            // selection prefers it.
            { card: "BT21-009", as: "bystander", under: [{ card: KNIGHTMON_BY_EFFECT, as: "elsewhere" }] },
          ],
        },
        // Suspended so it is a legal attack target; big enough that DarkKnightmon loses.
        1: { battleArea: [{ card: "BT1-013", as: "wall", dp: 20_000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("elsewhere").instanceId, s.inst("tooExpensive").instanceId, s.inst("eligible").instanceId);
    await s.ready();
    const sourceId = s.perm("darkKnight").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: sourceId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("eligible").instanceId),
    );

    // DarkKnightmon lost the battle and left; the cost 4 source it carried is now on the board.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(sourceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("wall").permanentId);
    // The cost 6 source and the other Digimon's cheap source both stayed put.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId)).not.toContain(
      s.inst("tooExpensive").instanceId,
    );
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.instanceId)).not.toContain(
      s.inst("elsewhere").instanceId,
    );
    expect(s.perm("bystander").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("elsewhere").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
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

  it("the inherited redirect is [Once Per Turn]: the second attack that turn is not redirected", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-019", as: "host", dp: 12_000, under: [{ card: CARD_ID, as: "source" }] }],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 4000 },
            { card: "BT1-013", as: "second", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const firstId = s.perm("first").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: firstId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstId));
    // Redirected into the 12000 DP host: the attacker died and no security was checked.
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(s.perm("host").permanentId);

    // Same turn, second attacker: the gate is spent, so the attack reaches security.
    const secondId = s.perm("second").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: secondId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(secondId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("the inherited [Once Per Turn] gate resets on the opponent's NEXT turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: ["BT1-013"],
          battleArea: [{ card: "BT1-019", as: "host", dp: 12_000, under: [{ card: CARD_ID, as: "source" }] }],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-013", "BT1-009", "BT1-013"],
        },
        1: {
          hand: ["BT1-013"],
          battleArea: [
            { card: "BT1-009", as: "first", dp: 4000 },
            { card: "BT1-013", as: "second", dp: 4000 },
            { card: "BT1-014", as: "third", dp: 4000 },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    const hostId = s.perm("host").permanentId;

    // Opponent's turn 1: the gate is fresh.
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    const firstId = s.perm("first").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: firstId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstId));
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);

    // Same turn, second attacker: the gate is spent, so the attack reaches security.
    const secondId = s.perm("second").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: secondId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3);
    expect(s.state.players[0]!.security).toHaveLength(3);

    // Cross a full turn cycle through the real loop: my turn, then their next turn.
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // Opponent's turn 2: the gate is live again, so a third attacker is redirected and dies
    // against the 12000 DP host without touching security.
    const securityBefore = s.state.players[0]!.security.length;
    const thirdId = s.perm("third").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: thirdId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === thirdId));
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // --- [DigiXros -1] [SkullKnightmon] x [DeadlyAxemon] -------------------------------------

  it("DigiXroses with both materials from HAND for 2 less and rejects a non-matching material", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "darkKnight" },
            { card: KNIGHTMON_BY_NAME, as: "skull" },
            { card: KNIGHTMON_BY_EFFECT, as: "deadly" },
            { card: "BT1-009", as: "wrong" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    // A card matching no recipe slot is refused outright: the play does not happen.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnight").instanceId,
        digiXros: { materialInstanceIds: [s.inst("skull").instanceId, s.inst("wrong").instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand).toHaveLength(4);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnight").instanceId,
        digiXros: { materialInstanceIds: [s.inst("skull").instanceId, s.inst("deadly").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;

    // Printed 7, -1 per placed material, 2 materials => 5 paid from 7 memory.
    expect(s.state.memory).toBe(2);
    // CR 7-2-2-8: the Digimon on the LEFT of the requirement ([SkullKnightmon]) is placed on
    // top. `stack` is bottom-most first, so DeadlyAxemon sits below SkullKnightmon.
    expect(played.stack.map(({ cardId }) => cardId)).toEqual([KNIGHTMON_BY_EFFECT, KNIGHTMON_BY_NAME]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("wrong").instanceId]);
  });

  it("takes a material from the BATTLE AREA, relocating that whole permanent under the new Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "darkKnight" },
            { card: KNIGHTMON_BY_EFFECT, as: "deadly" },
          ],
          battleArea: [{ card: KNIGHTMON_BY_NAME, as: "skullOnBoard", under: [{ card: "BT1-009", as: "beneath" }] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    const fieldMaterialId = s.perm("skullOnBoard").topCard!.instanceId;
    const fieldPermanentId = s.perm("skullOnBoard").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnight").instanceId,
        digiXros: { materialInstanceIds: [fieldMaterialId, s.inst("deadly").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;

    expect(s.state.memory).toBe(2);
    // CR 7-2-2-7: the battle-area material LEAVES the field to be placed, so only that card is
    // placed under the new Digimon; its own digivolution cards are trashed with it.
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(fieldPermanentId);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([fieldMaterialId, s.inst("deadly").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("beneath").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("places only 1 of the 2 named materials for a 1-step reduction (CR 7-2-2-4)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "darkKnight" },
            { card: KNIGHTMON_BY_NAME, as: "skull" },
            { card: KNIGHTMON_BY_EFFECT, as: "deadly" },
          ],
        },
        1: { battleArea: [{ card: KNIGHTMON_BY_NAME, as: "theirSkull" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    // The opponent's matching Digimon is not a legal material source.
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnight").instanceId,
        digiXros: { materialInstanceIds: [s.perm("theirSkull").topCard!.instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("darkKnight").instanceId,
        digiXros: { materialInstanceIds: [s.inst("skull").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === CARD_ID)!;

    // 1 material => -1 only: 6 paid from 7 memory.
    expect(s.state.memory).toBe(1);
    expect(played.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("skull").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("deadly").instanceId]);
  });
});
