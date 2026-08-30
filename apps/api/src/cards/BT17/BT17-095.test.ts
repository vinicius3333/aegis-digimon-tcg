import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-095.js";
import "../BT10/BT10-098.js";
import "./index.js";

describe("BT17-095 Miraculous Mega Knight", () => {
  it("keeps the Main play clause separate from the Omnimon Delay DNA effect", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "PlayWithoutCost" }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "DnaDigivolve",
          payCost: false,
          materials: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } },
          looseMaterials: { count: 1, from: ["hand"], filter: { zone: "hand", controller: "mine", kind: ["Digimon"] } },
          into: { nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }] },
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[1]).not.toHaveProperty("optional");
  });

  it("grants Delay only for an owned level 6 Greymon or Garurumon leaving outside battle", () => {
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanBattle",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        levels: [6],
        nameOrTrait: [{ tokens: ["Greymon", "Garurumon"], match: "name" }],
      },
      actions: [{ kind: "GainKeyword", keyword: { keyword: "Delay" } }],
    });
  });

  it("adds itself to hand after the Security Tamer play option", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
    });
  });

  it("places itself in the battle area when the optional Digimon play is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT17-007", "BT17-019"], hand: [{ card: "BT17-095", as: "option" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });

  it("naturally plays an Agumon or Gabumon from trash before entering the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT17-069", "BT17-019"],
          hand: [{ card: "BT17-095", as: "option" }],
          trash: [{ card: "BT17-007", as: "agumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-095") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-007"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-095")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-007")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("agumon").instanceId)).toBe(false);
  });

  it("naturally arms Delay when an opponent effect returns a qualifying level 6 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-113", as: "leavingGreymon" }, "BT17-069", "BT17-019"],
          hand: [{ card: "BT17-095", as: "option" }],
        },
        1: {
          battleArea: ["BT17-019"],
          hand: [{ card: "BT10-098", as: "returner" }],
        },
      },
      // Keep the armed Option on the field while the watcher is observed. Delay is
      // activated explicitly in its own Main window; auto-accepting every optional
      // prompt can consume that card before the grant assertion runs.
      { autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    const option = s.perm("option");
    const optionPermanentId = option.permanentId;
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("returner").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("leavingGreymon").instanceId) &&
        observe(s.engine).hasKeyword(optionPermanentId, "Delay"),
    );

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("leavingGreymon").instanceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(optionPermanentId, "Delay")).toBe(true);

    // The activated Main/Delay affordance is shown only to the current turn player.
    s.state.turnSeat = 0;
    await settle(() => {
      const activatable = observe(s.engine).activatableEffects(option);
      return Array.isArray(activatable) && activatable.length > 0;
    });
  });

  it("naturally plays a Tai/Matt card from Security, then adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT17-095", as: "securityOption" }],
          hand: [{ card: "BT17-081", as: "securityTamer" }],
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-081"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-081")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId)).toBe(true);
  });
});
