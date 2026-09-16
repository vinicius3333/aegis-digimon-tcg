import { assemblyRequirementFor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX13-020.js";

const cardId = "EX13-020";

describe("EX13-020 Magnamon", () => {
  it("matches the catalog identity and printed text", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Magnamon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 7,
      dp: 7000,
      forms: ["Armor Form"],
      attributes: ["Free"],
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 4 },
        { color: "Yellow", level: 3, memoryCost: 4 },
      ],
      inheritedEffectText:
        "[End of Your Turn] [Once Per Turn] 1 of your Digimon with the [Free] or [Royal Knight] trait may unsuspend.",
    });
    const effectText = getCardDefinition(cardId)?.effectText ?? "";
    expect(effectText).toContain("[Digivolve] [Veemon]: Cost 3");
    expect(effectText).toContain("[Assembly -2] [Veemon]");
    expect(effectText).toContain("＜Blocker＞");
    expect(effectText).toContain("＜Armor Purge＞");
    expect(effectText).toContain(
      "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] This Digimon gets +1000 DP until your opponent's turn ends for each color in trashes.",
    );
    expect(effectText).toContain(
      "Then, to 1 of your opponent's Digimon, give -4000 DP until their turn ends for every 5000 DP this Digimon has.",
    );
    expect(effectText).toContain(
      "[End of Your Turn] [Once Per Turn] 1 of your [Free] or [Royal Knight] trait Digimon may unsuspend.",
    );
  });

  it("compiles the printed headers, both keywords, the shared once-per-turn body and both unsuspend windows", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Veemon"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual([{ namesExact: ["Veemon"], cost: 3, isAlternate: true }]);
    expect(compiled.assemblyRequirement).toEqual([
      { reduceCost: 2, materials: [{ namesExact: ["Veemon"], count: 1 }] },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual(compiled.assemblyRequirement);

    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Armor Purge", raw: "＜Armor Purge＞" },
      ],
    });

    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-buff" });
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions).toHaveLength(2);
      expect(effect.actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: 1000,
        duration: "untilOpponentTurnEnd",
        target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
        scaling: { per: 1, unit: "colors", filter: { zone: "trash", controller: "any" } },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "ModifyDP",
        amount: -4000,
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      });
    }

    const unsuspendWindows = compiled.effects.filter((effect) => effect.trigger === "EndOfYourTurn");
    expect(unsuspendWindows).toHaveLength(2);
    expect(unsuspendWindows.map((effect) => effect.isInherited)).toEqual([undefined, true]);
    for (const effect of unsuspendWindows) {
      expect(effect).toMatchObject({ frequency: "OncePerTurn" });
      expect(effect.actions).toEqual([
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Free", "Royal Knight"], match: "trait" }],
            },
            count: 1,
          },
          optional: true,
          raw: "1 of your [Free] or [Royal Knight] trait Digimon may unsuspend",
        },
      ]);
    }

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("digivolves from a Blue Veemon for 3 on the alternate route, keeping the source stack and drawing 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-017", as: "veemon" }],
          hand: [
            { card: cardId, as: "magnamon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: [{ card: "BT1-011", as: "evolutionDraw" }, "BT1-012"],
          trash: [{ card: "BT1-009", as: "redTrash" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "victim", dp: 20_000 }], security: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard?.cardId === cardId);

    expect(s.perm("veemon").topCard?.instanceId).toBe(s.inst("magnamon").instanceId);
    expect(s.perm("veemon").stack.map((card) => card.cardId)).toEqual(["EX13-017"]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
    expect(s.perm("veemon").currentDP).toBe(8000);
    expect(s.perm("victim").currentDP).toBe(16_000);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("charges the printed Blue Lv.3 EvoCost of 4 when the alternate route is not requested", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-017", as: "veemon" }],
          hand: [
            { card: cardId, as: "magnamon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012"],
          trash: [{ card: "BT1-009", as: "redTrash" }],
        },
        1: { security: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("veemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard?.cardId === cardId);

    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("reaches the alternate route from a RED Veemon, which no printed EvoCost covers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-009", as: "redVeemon" }],
          hand: [
            { card: cardId, as: "magnamon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redVeemon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redVeemon").topCard?.cardId === cardId);

    expect(s.perm("redVeemon").stack.map((card) => card.cardId)).toEqual(["BT20-009"]);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("rejects an illegal source: a red Lv.3 that is not named Veemon satisfies neither route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "monodramon" }],
          hand: [
            { card: cardId, as: "magnamon" },
            { card: "BT1-010", as: "spare" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monodramon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
        useAlternateCost: true,
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("monodramon").permanentId,
        instanceId: s.inst("magnamon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(5);
  });

  it("plays by Assembly -2, placing one Veemon from the trash under it for a play cost of 5", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "magnamon" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [{ card: "EX13-017", as: "material" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "victim" }], security: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("magnamon").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === cardId));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === cardId)!;
    expect(played.stack.map((card) => card.cardId)).toEqual(["EX13-017"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX13-017")).toBe(false);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("rejects an Assembly declaration whose material is not named Veemon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "magnamon" }],
          trash: [{ card: "BT1-009", as: "wrongMaterial" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("magnamon").instanceId,
        assembly: { materialInstanceIds: [s.inst("wrongMaterial").instanceId] },
      } as never).ok,
    ).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(6);
  });

  it("scales the self buff by the distinct colors across BOTH trashes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "magnamon" }],
          trash: [
            { card: "BT1-009", as: "red" },
            { card: "EX13-017", as: "blue" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT1-014", as: "victim" }],
          trash: [{ card: "BT18-044", as: "greenBlack" }],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magnamon"));

    expect(s.perm("magnamon").currentDP).toBe(11_000);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("adds nothing when both trashes are empty, and the debuff still applies", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "magnamon" }],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: { battleArea: [{ card: "BT1-014", as: "victim" }], security: ["BT1-012", "BT1-013"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magnamon"));

    expect(s.perm("magnamon").currentDP).toBe(7000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-014"]);
    assertNoLoudGap(s);
  });

  it("gives -4000 DP to exactly 1 opponent Digimon and expires at the end of the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "magnamon" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen", dp: 20_000 },
            { card: "BT1-010", as: "untouched", dp: 20_000 },
          ],
          hand: [{ card: "BT1-011", as: "spareOpponent" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: [] },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magnamon"));

    const debuffed = [s.perm("chosen"), s.perm("untouched")];
    expect(debuffed.map((permanent) => permanent.currentDP).sort()).toEqual([16_000, 20_000]);
    assertNoLoudGap(s);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    expect(s.perm("chosen").currentDP).toBe(20_000);
    expect(s.perm("untouched").currentDP).toBe(20_000);
  });

  it.each([
    [0, 7000, 13000],
    [2, 9000, 13000],
    [3, 10000, 9000],
    [4, 11000, 9000],
    [6, 13000, 9000],
  ])("publicly plays with %i trash colors and scales from the post-buff DP", async (colors, sourceDP, targetDP) => {
    const trashCards = ["BT1-009", "BT1-027", "BT1-045", "BT1-064", "BT10-062", "BT10-079"].slice(0, colors);
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "magnamon" }],
          trash: trashCards.slice(0, 2),
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT12-112", as: "victim" }],
          trash: trashCards.slice(2),
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    const trashIds = s.state.players.map((player) => player.trash.map((card) => card.instanceId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").currentDP < 17000);
    const host = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("magnamon").instanceId,
    )!;
    expect(host.currentDP).toBe(sourceDP);
    expect(s.perm("victim").currentDP).toBe(targetDP);
    expect(host.stack.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([]);
    expect(s.state.players.map((player) => player.trash.map((card) => card.instanceId))).toEqual(trashIds);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("scales the opponent debuff by every 5000 DP this Digimon has", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "magnamon" }],
          trash: [
            { card: "BT1-009", as: "red" },
            { card: "EX13-017", as: "blue" },
          ],
          hand: [{ card: "BT1-010", as: "spare" }],
        },
        1: {
          battleArea: [{ card: "BT12-112", as: "victim" }],
          trash: [{ card: "BT18-044", as: "greenBlack" }],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magnamon"));

    expect(s.perm("magnamon").currentDP).toBe(11_000);
    expect(s.perm("victim").currentDP).toBe(9000);
  });

  it("shares one [Once Per Turn] across all three timings and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "magnamon" }],
          trash: [{ card: "BT1-009", as: "red" }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", dp: 20_000 }],
          hand: [{ card: "BT1-011", as: "spareOpponent" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-012", "BT1-013"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("magnamon"));
    expect(s.perm("magnamon").currentDP).toBe(8000);
    expect(s.perm("victim").currentDP).toBe(16_000);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("magnamon"));
    expect(s.perm("magnamon").currentDP).toBe(8000);
    expect(s.perm("victim").currentDP).toBe(16_000);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("magnamon"));
    expect(s.perm("magnamon").currentDP).toBe(8000);
    expect(s.perm("victim").currentDP).toBe(16_000);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    expect(s.perm("magnamon").currentDP).toBe(7000);
    expect(s.perm("victim").currentDP).toBe(20_000);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("magnamon"));
    expect(s.perm("magnamon").currentDP).toBe(8000);
    expect(s.perm("victim").currentDP).toBe(16_000);
  });

  it("unsuspends itself: Magnamon carries both the [Free] attribute and the [Royal Knight] type", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "magnamon", suspended: true }] },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("magnamon"));

    expect(s.perm("magnamon").isSuspended).toBe(false);
    assertNoLoudGap(s);
  });

  it("discriminates the trait filter three ways: [Free] matches, [Royal Base] and a plain Digimon do not", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: [cardId], suspended: true },
            { card: "BT18-044", as: "royalBase", suspended: true },
            { card: "BT1-010", as: "plain", suspended: true },
            { card: "BT2-021", as: "freeVeemon", suspended: true },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));

    expect(s.perm("freeVeemon").isSuspended).toBe(false);
    expect(s.perm("royalBase").isSuspended).toBe(true);
    expect(s.perm("plain").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("unsuspends a [Royal Knight] that is not [Free], and a [Free] Digimon that is not a Royal Knight", async () => {
    const knightPreference: string[] = [];
    const royalKnight = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "magnamon" },
            { card: "BT6-111", as: "alphamon", suspended: true },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: knightPreference },
    );
    await royalKnight.ready();
    knightPreference.push(royalKnight.perm("alphamon").permanentId);

    await advance(royalKnight.engine).fire(EffectTiming.EndOfYourTurn, royalKnight.perm("magnamon"));
    expect(royalKnight.perm("alphamon").isSuspended).toBe(false);

    const freePreference: string[] = [];
    const free = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "magnamon" },
            { card: "BT2-021", as: "veemon", suspended: true },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: freePreference },
    );
    await free.ready();
    freePreference.push(free.perm("veemon").permanentId);

    await advance(free.engine).fire(EffectTiming.EndOfYourTurn, free.perm("magnamon"));
    expect(free.perm("veemon").isSuspended).toBe(false);
  });

  it("never reaches the opponent's [Free] Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "magnamon" }] },
        1: {
          battleArea: [{ card: "BT2-021", as: "theirVeemon", suspended: true }],
          security: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("magnamon"));

    expect(s.perm("theirVeemon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("leaves the Digimon suspended when the printed 'may' is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "magnamon", suspended: true }] },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("magnamon"));

    expect(s.perm("magnamon").isSuspended).toBe(true);
  });

  it("fires the unsuspend once per turn and resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "magnamon", suspended: true }],
          hand: [{ card: "BT1-010", as: "spare" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          hand: [{ card: "BT1-011", as: "spareOpponent" }],
          deck: ["BT1-011", "BT1-012", "BT1-013"],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("magnamon"));
    expect(s.perm("magnamon").isSuspended).toBe(false);

    s.perm("magnamon").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("magnamon"));
    expect(s.perm("magnamon").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);

    s.state.turnSeat = 0;
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("magnamon"));
    expect(s.perm("magnamon").isSuspended).toBe(false);
  });

  it("grants the same unsuspend window to a host it sits under as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", under: [cardId], suspended: true }],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("host"));
    expect(s.perm("host").isSuspended).toBe(true);

    const withTarget = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "host", under: [cardId] },
            { card: "BT2-021", as: "veemon", suspended: true },
          ],
        },
        1: { security: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withTarget.ready();

    await advance(withTarget.engine).fire(EffectTiming.EndOfYourTurn, withTarget.perm("host"));
    expect(withTarget.perm("veemon").isSuspended).toBe(false);
    expect(withTarget.perm("host").stack.map((card) => card.cardId)).toEqual([cardId]);
  });

  it("opens a real block window and intercepts an attack with ＜Blocker＞", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: { battleArea: [{ card: cardId, as: "magnamon" }], security: ["BT1-011"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("magnamon").permanentId],
    });

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("magnamon").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("magnamon"), "Blocker")).toBe(true);
  });

  it("sheds its own top card to ＜Armor Purge＞ out of a lost battle instead of being deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "magnamon", under: ["EX13-017"] }] },
        1: {
          battleArea: [{ card: "BT1-014", as: "bigger", dp: 20_000, suspended: true }],
          security: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("magnamon"), "Armor Purge")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("bigger").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    const survivor = s.state.players[0]!.battleArea[0];
    expect(survivor?.topCard?.cardId).toBe("EX13-017");
    expect(survivor?.stack.map((card) => card.cardId)).toEqual([]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([cardId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
