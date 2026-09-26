import { describe, expect, it } from "vitest";
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

  it("opens and resolves its ＜Delay＞ window when an opponent effect deletes an owned Tamer", async () => {
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
    // "[All Turns] When one of your Tamers is deleted or returned to the hand, ＜Delay＞" opens its
    // window at that deletion, on the opponent's turn — not in a later own Main phase.
    await settle(() => s.perm("rize").topCard?.cardId === "BT17-039");

    expect(s.perm("rize").topCard?.cardId).toBe("BT17-039");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-099")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shine").instanceId)).toBe(false);
  });

  it("opens its ＜Delay＞ window when an opponent effect returns an owned Tamer to hand", async () => {
    const preferred: string[] = [];
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
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    // The returned [Marcus Damon] joins the hand alongside the [ShineGreymon] card, so name the
    // digivolution target the clause is about.
    preferred.push(s.inst("shine").instanceId);
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
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT17-099"));

    expect(
      s.events.some(
        (event) =>
          event.kind === "cardsMoved" && event.to === "hand" && event.instanceIds.includes(s.inst("marcus").instanceId),
      ),
    ).toBe(true);
    // ShineGreymon's resulting [When Digivolving] plays the returned Marcus back out.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-087")).toBe(true);
    // The return opens the window on the opponent's turn: the player is asked, and accepting pays
    // §16-17-1's cost by trashing this card from the battle area.
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === optionPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-099")).toBe(true);
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
    expect(s.state.memory).toBe(0);
  });

  it("does not let the Delay digivolve use a [ShineGreymon] card from the trash", async () => {
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
    await settle();
    // No legal digivolution pair, so the ＜Delay＞ window resolves to nothing and never charges
    // its §16-17-1 activation cost.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === optionPermanentId)).toBe(true);

    expect(s.perm("rize").topCard?.cardId).toBe("BT17-037");
    expect(s.perm("rize").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("shine").instanceId)).toBe(true);
  });

  it("does not ignore the digivolution requirements of the [ShineGreymon] card", async () => {
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
    await settle();
    // No legal digivolution pair, so the ＜Delay＞ window resolves to nothing and never charges
    // its §16-17-1 activation cost.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === optionPermanentId)).toBe(true);

    expect(s.perm("rookie").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("rookie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("shine").instanceId)).toBe(true);
  });
  it("offers Marcus Damon & Agumon through its name rule beside the exact [Marcus Damon]", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [
            { card: "BT17-099", as: "option" },
            { card: "AD1-021", as: "ruleName" },
            { card: "BT17-087", as: "marcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const ruleNameId = s.inst("ruleName").instanceId;
    const marcusId = s.inst("marcus").instanceId;
    preferred.push(ruleNameId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === ruleNameId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === marcusId)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([marcusId]);
  });

  it("plays Marcus Damon & Agumon through its name rule when it is the only candidate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-036"],
          hand: [
            { card: "BT17-099", as: "option" },
            { card: "AD1-021", as: "ruleName" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const optionId = s.inst("option").instanceId;
    const ruleNameId = s.inst("ruleName").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === ruleNameId)).toBe(true);
  });

  it("still accepts ST24-13, whose static name list contains [Marcus Damon]", async () => {
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
    expect(s.state.memory).toBe(0);
  });
});
