import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-099.js";
import "../BT10/BT10-069.js";
import "../BT13/BT13-031.js";
import "../BT15/BT15-097.js";
import "./index.js";

describe("BT17-099 Awakening of the Sun", () => {
  it("keeps the Main play clause separate from the Delay digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlayWithoutCost" }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(compiled.effects?.[0]?.actions?.[1]).not.toHaveProperty("optional");
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          into: { nameOrTrait: [{ tokens: ["ShineGreymon"], match: "name" }] },
        },
      ],
    });
  });

  it("grants Delay when an owned Tamer is deleted or returned to hand", () => {
    expect(compiled.effects?.[2]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "mine", kind: ["Tamer"] },
        }),
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          sourceFilter: { controller: "mine", kind: ["Tamer"] },
        }),
      ]),
    );
  });

  it("keeps Security limited to Marcus Damon or Rhythm", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"] }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(compiled.effects?.[3]?.actions?.[1]).not.toHaveProperty("optional");
  });

  it("places itself after the optional Main play is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT17-036"], hand: [{ card: "BT17-099", as: "option" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });

  it("naturally plays Marcus Damon from trash before entering the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [{ card: "BT17-099", as: "option" }],
          trash: [{ card: "BT17-087", as: "marcus" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-099") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-087"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-099")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-087")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(false);
  });

  it("naturally arms and activates Delay after an opponent effect deletes an owned Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-099", as: "option" },
            { card: "BT17-037", as: "rize" },
            { card: "BT17-087", as: "marcus" },
          ],
          hand: [{ card: "BT17-039", as: "shine" }],
        },
        1: {
          battleArea: [{ card: "BT10-066", as: "darkKnightmon" }],
          hand: [{ card: "BT10-069", as: "darkKnightmonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const option = s.perm("option");
    const optionPermanentId = option.permanentId;
    const optionInstanceId = option.topCard.instanceId;
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("darkKnightmon").permanentId,
        instanceId: s.inst("darkKnightmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-087"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-087")).toBe(false);
    expect(observe(s.engine).hasKeyword(optionPermanentId, "Delay")).toBe(true);

    s.state.turnCount += 1;
    s.state.turnSeat = 0;
    const effects = observe(s.engine).activatableEffects(option) as Array<{
      effectKey: string;
      description?: string;
    }>;
    const delay = effects.find((effect) => String(effect.description).toLowerCase().includes("delay"));
    expect(delay).toBeDefined();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: optionInstanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rize").topCard?.cardId === "BT17-039");

    expect(s.perm("rize").topCard?.cardId).toBe("BT17-039");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shine").instanceId)).toBe(false);
  });

  it("naturally arms Delay when an opponent effect returns an owned Tamer to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-099", as: "option" },
            { card: "BT17-037", as: "rize" },
            { card: "BT17-087", as: "marcus" },
          ],
          hand: [{ card: "BT17-039", as: "shine" }],
        },
        1: {
          battleArea: [{ card: "BT13-029", as: "machGaogamon" }],
          hand: [{ card: "BT13-031", as: "mirageGaogamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const option = s.perm("option");
    const optionPermanentId = option.permanentId;
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("machGaogamon").permanentId,
        instanceId: s.inst("mirageGaogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId) &&
        observe(s.engine).hasKeyword(optionPermanentId, "Delay"),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("marcus").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(optionPermanentId, "Delay")).toBe(true);
  });

  it("naturally plays Marcus Damon from Security, then places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT17-099", as: "securityOption" }],
          hand: [{ card: "BT17-087", as: "marcus" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-099") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-087"),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-099")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-087")).toBe(true);
  });
  it("plays [Rhythm] from hand and leaves a non-matching Tamer behind", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [
            { card: "BT17-099", as: "option" },
            { card: "BT17-089", as: "rhythm" },
            { card: "BT17-080", as: "takato" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const rhythmId = s.inst("rhythm").instanceId;
    const takatoId = s.inst("takato").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === rhythmId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([takatoId]);
    // Rhythm costs 4 but is played for free; only the Option's own cost 3 is paid.
    expect(s.state.memory).toBe(0);
  });

  it("does not let the Delay digivolve use a [ShineGreymon] card from the trash", async () => {
    // Q2895: the digivolution source is the hand only.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-099", as: "option" },
            { card: "BT17-037", as: "rize" },
            { card: "BT17-087", as: "marcus" },
          ],
          hand: ["BT1-012"],
          trash: [{ card: "BT17-039", as: "shine" }],
        },
        1: {
          battleArea: [{ card: "BT10-066", as: "darkKnightmon" }],
          hand: [{ card: "BT10-069", as: "darkKnightmonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const option = s.perm("option");
    const optionPermanentId = option.permanentId;
    const optionInstanceId = option.topCard.instanceId;
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("darkKnightmon").permanentId,
        instanceId: s.inst("darkKnightmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(optionPermanentId, "Delay"));
    expect(observe(s.engine).hasKeyword(optionPermanentId, "Delay")).toBe(true);

    s.state.turnCount += 1;
    s.state.turnSeat = 0;
    const effects = observe(s.engine).activatableEffects(option) as Array<{
      effectKey: string;
      description?: string;
    }>;
    const delay = effects.find((effect) => String(effect.description).toLowerCase().includes("delay"));
    expect(delay).toBeDefined();
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: optionInstanceId,
      effectKey: delay!.effectKey,
    });
    if (result.ok) await settle(() => true);

    expect(s.perm("rize").topCard?.cardId).toBe("BT17-037");
    expect(s.perm("rize").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("shine").instanceId)).toBe(true);
  });

  it("does not ignore the digivolution requirements of the [ShineGreymon] card", async () => {
    // Q2894: BT17-039 needs a yellow level 5 source; a purple Rookie cannot digivolve into it.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-099", as: "option" },
            { card: "BT1-009", as: "rookie" },
            { card: "BT17-087", as: "marcus" },
          ],
          hand: [{ card: "BT17-039", as: "shine" }, "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT10-066", as: "darkKnightmon" }],
          hand: [{ card: "BT10-069", as: "darkKnightmonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("option").placedByEffect = true;
    const option = s.perm("option");
    const optionPermanentId = option.permanentId;
    const optionInstanceId = option.topCard.instanceId;
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("darkKnightmon").permanentId,
        instanceId: s.inst("darkKnightmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(optionPermanentId, "Delay"));
    expect(observe(s.engine).hasKeyword(optionPermanentId, "Delay")).toBe(true);

    s.state.turnCount += 1;
    s.state.turnSeat = 0;
    const effects = observe(s.engine).activatableEffects(option) as Array<{
      effectKey: string;
      description?: string;
    }>;
    const delay = effects.find((effect) => String(effect.description).toLowerCase().includes("delay"));
    expect(delay).toBeDefined();
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: optionInstanceId,
      effectKey: delay!.effectKey,
    });
    if (result.ok) await settle(() => true);

    expect(s.perm("rookie").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("rookie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shine").instanceId)).toBe(true);
  });
  it("refuses a near-name Tamer and plays only the exact [Marcus Damon]", async () => {
    // The printed clause has no "in its name", so the filter is exact-name.
    // AD1-021 "Marcus Damon & Agumon" contains the string but is a different card.
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [
            { card: "BT17-099", as: "option" },
            { card: "AD1-021", as: "nearName" },
            { card: "BT17-087", as: "marcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const nearNameId = s.inst("nearName").instanceId;
    const marcusId = s.inst("marcus").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === marcusId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === nearNameId)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([nearNameId]);
  });

  it("refuses the near-name Tamer outright when it is the only candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [
            { card: "BT17-099", as: "option" },
            { card: "AD1-021", as: "nearName" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const nearNameId = s.inst("nearName").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([nearNameId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === nearNameId)).toBe(false);
  });

  it("still accepts ST24-13, whose static name list contains [Marcus Damon]", async () => {
    // ST24-13 "Marcus Damon & Thomas H. Norstein" is listed in
    // packages/shared/src/cards/effectiveNames.ts STATIC_NAME_ALIASES_BY_CARD_ID with the
    // names ["Marcus Damon", "Thomas H. Norstein"], so it answers to the exact-name gate.
    // AD1-021 "Marcus Damon & Agumon" carries no such alias entry and is refused above.
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [{ card: "BT17-099", as: "option" }, { card: "ST24-13", as: "aliased" }, "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const aliasedId = s.inst("aliased").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === aliasedId)).toBe(true);
    // ST24-13 costs 4 and is played for free; only the Option's own cost 3 is paid.
    expect(s.state.memory).toBe(0);
  });
});
