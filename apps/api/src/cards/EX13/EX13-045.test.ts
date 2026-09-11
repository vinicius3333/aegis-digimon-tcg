import { dnaDigivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-045.js";
// The whole registry, so the public fixtures (the DNA materials, the played [Dracomon] cards)
// carry their own implementations; EX13-045 itself is registered by the import above.
import "../index.js";

const cardId = "EX13-045";

// Fixtures, and why each one is here:
//   BT1-080  Titamon      mono-GREEN Lv.6 12000 DP, no text — the Green DNA material and the
//                         printed Green Lv.6-for-5 EvoCost base. Inert, so the merge adds no noise.
//   ST2-10   Plesiomon    mono-BLUE Lv.6 12000 DP, no text — the Blue DNA material.
//   ST1-10   Phoenixmon   mono-RED Lv.6 12000 DP, no text — a legal printed-EvoCost base that is
//                         NOT part of the Green+Blue DNA pair: the illegal DNA-material negative.
//   BT20-023 Coredramon   Blue/Red Lv.4, play cost 5 — [Dracomon]/[Examon] only in its EFFECT
//                         text, so it proves `match: "text"` reaches past the name.
//   ST8-03   Dracomon     Blue Lv.3, play cost 3 — [Dracomon] by NAME.
//   BT20-093 Unleash the Dragon Gene — mono-Red Option, use cost 2, [Dracomon] in its text: the
//                         "or use" branch.
//   BT1-009  Monodramon   Red Lv.3 3000 DP, no text — the NEAR MISS: its name contains "dramon"
//                         but not "Dracomon", so every text filter must refuse it.
//   BT1-013  Muchomon     Red Lv.3 5000 DP, no text — the plain non-matching control.
//   BT1-010..BT1-014      inert red main-deck Digimon — neutral board and deck filler.
const GREEN_MATERIAL = "BT1-080";
const BLUE_MATERIAL = "ST2-10";
const RED_LV6 = "ST1-10";
const TEXT_MATCH = "BT20-023";
const NAME_MATCH = "ST8-03";
const OPTION_MATCH = "BT20-093";
const NEAR_MISS = "BT1-009";
const NON_MATCH = "BT1-013";

/** Seat 0 DNA digivolves the seeded Green + Blue Lv.6 pair into Examon for the printed cost 0. */
const dnaIntent = (s: ReturnType<typeof setupEngine>) =>
  s.engine.applyIntent(0, {
    type: "dnaDigivolve",
    materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
    instanceId: s.inst("examon").instanceId,
  });

describe("EX13-045 Examon", () => {
  it("matches the catalog and the committed IR clause for clause", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Examon",
      colors: ["Green", "Red", "Blue"],
      kinds: ["Digimon"],
      playCost: 15,
      dp: 15_000,
      level: 7,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [
        { color: "Green", level: 6, memoryCost: 5 },
        { color: "Red", level: 6, memoryCost: 5 },
        { color: "Blue", level: 6, memoryCost: 5 },
      ],
    });

    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(
      compiled.effects.filter(({ trigger }) => trigger === "Static").flatMap(({ keywords }) => keywords ?? []),
    ).toEqual([
      { keyword: "Raid", raw: "＜Raid＞" },
      { keyword: "Piercing", raw: "＜Piercing＞" },
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security A. +1＞" },
      { keyword: "Blocker", raw: "＜Blocker＞" },
      { keyword: "Evade", raw: "＜Evade＞" },
    ]);

    // "If DNA digivolving" gates all three halves of the [When Digivolving] clause.
    const whenDigivolving = compiled.effects.find(({ trigger }) => trigger === "WhenDigivolving");
    expect(whenDigivolving?.frequency).toBeUndefined();
    expect(whenDigivolving).toMatchObject({
      actions: [
        {
          kind: "ModifyDP",
          amount: 10_000,
          duration: "untilOpponentTurnEnd",
          target: { count: "all", filter: { controller: "mine", kind: ["Digimon"] } },
          condition: { kind: "isDnaDigivolving" },
        },
        {
          kind: "Attack",
          withoutSuspending: false,
          target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          condition: { kind: "isDnaDigivolving" },
        },
        {
          kind: "Battle",
          optional: true,
          attacker: { count: 1, isSelf: true, filter: { isSelfRef: true } },
          defender: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          condition: { kind: "isDnaDigivolving" },
        },
      ],
    });
    // The mandatory attack carries no `attackPlayer` narrowing: a bare "this Digimon attacks"
    // keeps the player in the candidate list.
    expect(whenDigivolving?.actions[1]).not.toHaveProperty("attackPlayer");

    const battleWon = compiled.effects.find(({ trigger }) => trigger === "YourTurn");
    expect(battleWon).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Modal",
              choose: 1,
              options: [
                [
                  {
                    kind: "PlayWithoutCost",
                    from: ["hand", "digivolutionCards"],
                    payCost: false,
                    optional: true,
                    target: {
                      count: 1,
                      source: "thisDigimon",
                      filter: {
                        controllerDefault: "mine",
                        kind: ["Digimon", "Tamer"],
                        playCostLte: 12,
                        nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                      },
                    },
                  },
                ],
                [
                  {
                    kind: "UseOptionWithoutCost",
                    from: ["hand", "digivolutionCards"],
                    payCost: false,
                    allowMultiColor: true,
                    optional: true,
                    filter: {
                      controllerDefault: "mine",
                      kind: ["Option"],
                      playCostLte: 12,
                      nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
                    },
                    target: { count: 1, source: "thisDigimon" },
                  },
                ],
              ],
            },
          ],
        },
      ],
    });
    expect(battleWon?.sharedUseKey).toBeUndefined();

    expect(dnaDigivolutionRequirementsFor(cardId)).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Green", level: 6 },
          { color: "Blue", level: 6 },
        ],
      },
    ]);
  });

  // [DNA Digivolve] Green Lv.6 + Blue Lv.6 : Cost 0
  it("DNA digivolves the Green + Blue Lv.6 pair for 0 and keeps both materials as its source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_MATERIAL, as: "green", under: ["BT1-010"] },
            { card: BLUE_MATERIAL, as: "blue" },
          ],
          hand: [{ card: cardId, as: "examon" }],
        },
        1: { security: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(dnaIntent(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && !observe(s.engine).isAttacking());

    // One permanent, Examon on top, both Lv.6 materials (and the Green one's own stack card)
    // beneath it: `Permanent.stack` holds only the cards under the top card.
    const merged = s.state.players[0]!.battleArea[0]!;
    expect(merged.topCard.cardId).toBe(cardId);
    expect(merged.stack.map(({ cardId: id }) => id).sort()).toEqual(["BT1-010", BLUE_MATERIAL, GREEN_MATERIAL].sort());
    // Cost 0: memory is untouched by the route itself.
    expect(s.state.memory).toBe(2);
    for (const keyword of ["Raid", "Piercing", "Blocker", "Evade"]) {
      expect(observe(s.engine).hasKeyword(merged, keyword)).toBe(true);
    }
  });

  it("refuses a Red Lv.6 as a DNA material and charges the printed EvoCost on a normal digivolve", async () => {
    // The printed DNA header names Green + Blue only, so a Green + RED pair is not that route.
    const illegal = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_MATERIAL, as: "green" },
            { card: RED_LV6, as: "red" },
          ],
          hand: [{ card: cardId, as: "examon" }],
        },
      },
      { autoDeclineOptional: true },
    );
    illegal.state.memory = 2;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [illegal.perm("green").permanentId, illegal.perm("red").permanentId],
        instanceId: illegal.inst("examon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(illegal.state.players[0]!.battleArea).toHaveLength(2);
    expect(illegal.state.memory).toBe(2);

    // The catalog's Green Lv.6-for-5 EvoCost is a separate, NON-DNA route: it charges 5 and, as
    // the next test proves, does not activate the "If DNA digivolving" clause.
    const normal = setupEngine(
      {
        0: {
          battleArea: [{ card: GREEN_MATERIAL, as: "green" }],
          hand: [{ card: cardId, as: "examon" }],
        },
        1: { security: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    normal.state.memory = 5;
    await normal.ready();
    expect(
      normal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: normal.perm("green").permanentId,
        instanceId: normal.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => normal.perm("green").topCard.cardId === cardId);
    expect(normal.state.memory).toBe(0);
  });

  // [When Digivolving] If DNA digivolving, this Digimon attacks and all of your Digimon get
  // +10000 DP until your opponent's turn ends.
  it("buffs every own Digimon by 10000 and attacks the player for two security checks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_MATERIAL, as: "green" },
            { card: BLUE_MATERIAL, as: "blue" },
            { card: NON_MATCH, as: "ally" },
          ],
          hand: [{ card: cardId, as: "examon" }],
        },
        1: { security: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(dnaIntent(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    const merged = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    // 15000 printed + 10000, and the untouched ally 5000 + 10000: "all of your Digimon".
    expect(merged.currentDP).toBe(25_000);
    expect(s.perm("ally").currentDP).toBe(15_000);
    // ＜Security A. +1＞: exactly TWO of the three security cards were checked.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
    // The attack suspended the attacker, and no opponent Digimon existed for the "may battle".
    expect(merged.isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not attack or buff when Examon arrives by the printed non-DNA route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_MATERIAL, as: "green" },
            { card: NON_MATCH, as: "ally" },
          ],
          hand: [{ card: cardId, as: "examon" }],
        },
        1: { security: ["BT1-011", "BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("green").permanentId,
        instanceId: s.inst("examon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("green").topCard.cardId === cardId);

    expect(s.perm("green").currentDP).toBe(15_000);
    expect(s.perm("ally").currentDP).toBe(5000);
    expect(s.perm("green").isSuspended).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  // Then, this Digimon may battle 1 of your opponent's Digimon.
  it("battles a surviving opponent Digimon after the forced attack, and declines when told to", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_MATERIAL, as: "green" },
            { card: BLUE_MATERIAL, as: "blue" },
          ],
          hand: [{ card: cardId, as: "examon" }],
        },
        // Suspended, so ＜Raid＞ (which only ever switches onto an UNSUSPENDED Digimon) has no
        // candidate and cannot consume this body before the "may battle" reaches it.
        1: { battleArea: [{ card: NON_MATCH, as: "prey", suspended: true }], security: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    accepted.state.memory = 2;
    await accepted.ready();
    const preyId = accepted.perm("prey").permanentId;

    expect(dnaIntent(accepted)).toEqual({ ok: true });
    await settle(
      () =>
        !accepted.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === preyId) &&
        !observe(accepted.engine).isAttacking(),
    );

    // 25000 DP beats 5000, so the battled Digimon is deleted and Examon survives.
    expect(accepted.state.players[1]!.battleArea).toHaveLength(0);
    expect(accepted.state.players[0]!.battleArea).toHaveLength(1);
    expect(accepted.state.players[0]!.battleArea[0]!.topCard.cardId).toBe(cardId);

    // Declined: the same board, the same forced attack, but the optional battle is refused, so
    // the opponent's Digimon is still there afterwards.
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: GREEN_MATERIAL, as: "green" },
            { card: BLUE_MATERIAL, as: "blue" },
          ],
          hand: [{ card: cardId, as: "examon" }],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "prey", suspended: true }], security: ["BT1-011", "BT1-012"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.memory = 2;
    await declined.ready();

    expect(dnaIntent(declined)).toEqual({ ok: true });
    await settle(() => !observe(declined.engine).isAttacking() && declined.state.pendingDecision === undefined);

    expect(declined.state.players[1]!.battleArea).toHaveLength(1);
    expect(declined.state.players[1]!.battleArea[0]!.permanentId).toBe(declined.perm("prey").permanentId);
  });

  // ＜Blocker＞: §16-4.
  it("blocks an opponent's attack on the player and wins the battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "examon" }], security: ["BT1-010"] },
        1: { battleArea: [{ card: NON_MATCH, dp: 5000, as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    const window = s.events.findLast(({ kind }) => kind === "blockWindowOpened");
    if (window?.kind !== "blockWindowOpened") throw new Error("block window did not open");
    expect(window.eligibleBlockerIds).toContain(s.perm("examon").permanentId);

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("examon").permanentId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  // ＜Raid＞: §16-23 — switch an attack on the player onto the opponent's unsuspended Digimon
  // with the highest DP.
  it("switches an attack on the player onto the opponent's unsuspended Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "examon" }], hand: [{ card: "BT1-010", as: "spare" }] },
        1: {
          battleArea: [
            { card: NON_MATCH, dp: 9000, as: "wall" },
            { card: NEAR_MISS, dp: 3000, as: "weak" },
          ],
          security: ["BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const wallId = s.perm("wall").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === wallId));

    // The attack landed on the HIGHEST-DP unsuspended Digimon, not the 3000 DP one...
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([NEAR_MISS]);
    // ...and ＜Piercing＞ then performed the security checks the attack would normally have done:
    // ＜Security A. +1＞ makes that two, which empties the stack.
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("examon").isSuspended).toBe(true);
  });

  // ＜Piercing＞: §16-3 — an attacker that deletes its defender and survives still checks security.
  it("pierces through a deleted defender into two security checks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "examon" }], hand: [{ card: "BT1-010", as: "spare" }] },
        1: {
          battleArea: [{ card: NON_MATCH, dp: 5000, as: "prey", suspended: true }],
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  // ＜Evade＞: §16-8 — by suspending itself, the Digimon is not deleted.
  it("evades an effect deletion by suspending itself instead of leaving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "examon" }] } }, { autoDeclineOptional: true });
    await s.ready();
    const examonId = s.perm("examon").permanentId;

    const deletion = advance(s.engine).verb.deletePermanent([examonId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    // The window is open and nothing has been decided yet: still on the board, still unsuspended.
    expect(s.perm("examon").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: examonId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("examon").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  // [Your Turn] [Once Per Turn] When this Digimon wins a battle, you may play 1 play or use cost
  // 12 or lower [Dracomon] or [Examon] text card from your hand or its digivolution cards.
  it("plays a [Dracomon]-text card from its own digivolution cards after winning a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "examon", under: [{ card: TEXT_MATCH, as: "buried" }] }],
          hand: [{ card: NEAR_MISS, as: "nearMiss" }],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "prey", suspended: true }], security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    const buriedId = s.inst("buried").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("examon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("prey").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === buriedId) &&
        !observe(s.engine).isAttacking(),
    );

    // The buried Coredramon — [Examon] in its EFFECT text only — left the stack for the battle
    // area, free of charge, and the near-miss Monodramon stayed in hand.
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === buriedId)).toBe(true);
    expect(s.perm("examon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual([NEAR_MISS]);
    expect(s.state.memory).toBe(3);
  });

  it("plays a [Dracomon]-named card from hand and never the near-miss or over-cost candidates", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "examon" }],
          hand: [
            { card: NAME_MATCH, as: "dracomon" },
            { card: NEAR_MISS, as: "nearMiss" },
            { card: NON_MATCH, as: "nonMatch" },
            // An [Examon] card whose play cost is 15 — above the printed 12 ceiling.
            { card: cardId, as: "overCost" },
          ],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "prey", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("examon").permanentId });
    await settle(() => s.state.players[0]!.hand.length === 3);

    // Only the cost-3 Dracomon was eligible: the near miss, the plain control and the cost-15
    // Examon all stayed in hand, and the play cost nothing.
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual(
      [NAME_MATCH, cardId].sort(),
    );
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id).sort()).toEqual([NEAR_MISS, NON_MATCH, cardId].sort());
    expect(s.state.memory).toBe(3);
  });

  it("finds no candidate at all when only the near-miss and over-cost cards are available", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "examon" }],
          hand: [
            { card: NEAR_MISS, as: "nearMiss" },
            { card: NON_MATCH, as: "nonMatch" },
            { card: cardId, as: "overCost" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("examon").permanentId });
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.memory).toBe(3);
  });

  // ... or USE 1 such card: the Option branch of the same printed sentence.
  it("uses a [Dracomon]-text Option from hand without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "examon" }],
          hand: [{ card: OPTION_MATCH, as: "option" }],
          deck: [{ card: "BT1-010" }, { card: "BT1-011" }, { card: "BT1-012" }],
        },
        1: { battleArea: [{ card: NON_MATCH, as: "prey", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: 1 },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("examon").permanentId });
    await settle(() => s.state.players[0]!.hand.length === 0);

    // The Option left the hand and its own [Main] effect resolved: "place this card in the battle
    // area" is the last step of BT20-093's printed Main, so its arrival there is the proof that
    // the USE branch really ran the borrowed effect rather than just discarding the card.
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId, OPTION_MATCH]);
    // "without paying the cost": the use cost 2 was never charged.
    expect(s.state.memory).toBe(3);
  });

  // [Once Per Turn], and [Your Turn].
  it("fires once per own turn, refuses the second win, and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "examon" }],
          hand: [
            { card: NAME_MATCH, as: "first" },
            { card: TEXT_MATCH, as: "second" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: Array(12).fill("BT1-011"),
          security: Array(4).fill("BT1-010"),
        },
        1: { security: Array(4).fill("BT1-012"), deck: Array(12).fill("BT1-013") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("examon").permanentId });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);

    // Second win in the SAME turn: the per-turn budget is spent, so nothing else is played.
    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("examon").permanentId });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);

    // Through the real turn loop: the opponent's turn, then back to seat 0.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("examon").permanentId });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "examon" }],
          hand: [{ card: NAME_MATCH, as: "dracomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("examon").permanentId });
    await settle();

    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual([NAME_MATCH]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("does not fire when another Digimon wins the battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "examon" },
            { card: NON_MATCH, as: "other" },
          ],
          hand: [{ card: NAME_MATCH, as: "dracomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("other").permanentId });
    await settle();

    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual([NAME_MATCH]);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
