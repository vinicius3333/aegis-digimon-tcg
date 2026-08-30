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
});
