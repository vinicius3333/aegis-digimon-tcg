import { dnaDigivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-045.js";
import "../index.js";

const cardId = "EX13-045";

const GREEN_MATERIAL = "BT1-080";
const BLUE_MATERIAL = "ST2-10";
const RED_LV6 = "ST1-10";
const TEXT_MATCH = "BT20-023";
const NAME_MATCH = "ST8-03";
const OPTION_MATCH = "BT20-093";
const NEAR_MISS = "BT1-009";
const NON_MATCH = "BT1-013";

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

    const merged = s.state.players[0]!.battleArea[0]!;
    expect(merged.topCard.cardId).toBe(cardId);
    expect(merged.stack.map(({ cardId: id }) => id).sort()).toEqual(["BT1-010", BLUE_MATERIAL, GREEN_MATERIAL].sort());
    expect(s.state.memory).toBe(2);
    for (const keyword of ["Raid", "Piercing", "Blocker", "Evade"]) {
      expect(observe(s.engine).hasKeyword(merged, keyword)).toBe(true);
    }
  });

  it("refuses a Red Lv.6 as a DNA material and charges the printed EvoCost on a normal digivolve", async () => {
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
    expect(merged.currentDP).toBe(25_000);
    expect(s.perm("ally").currentDP).toBe(15_000);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
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

    expect(accepted.state.players[1]!.battleArea).toHaveLength(0);
    expect(accepted.state.players[0]!.battleArea).toHaveLength(1);
    expect(accepted.state.players[0]!.battleArea[0]!.topCard.cardId).toBe(cardId);

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

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([NEAR_MISS]);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.perm("examon").isSuspended).toBe(true);
  });

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

  it("evades an effect deletion by suspending itself instead of leaving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "examon" }] } }, { autoDeclineOptional: true });
    await s.ready();
    const examonId = s.perm("examon").permanentId;

    const deletion = advance(s.engine).verb.deletePermanent([examonId], "byEffect");
    await settle(() => s.events.some(({ kind }) => kind === "evadePrompt"));
    expect(s.perm("examon").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "respondEvade", permanentId: examonId, accept: true })).toEqual({
      ok: true,
    });
    expect(await deletion).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("examon").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

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

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([cardId, OPTION_MATCH]);
    expect(s.state.memory).toBe(3);
  });

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

    await advance(s.engine).fireSubTrigger("whenBattleWon", { attackerPermanentId: s.perm("examon").permanentId });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(2);

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
