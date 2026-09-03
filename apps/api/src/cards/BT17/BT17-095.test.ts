import { describe, expect, it } from "vitest";
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
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          leaveCause: "otherThanBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levels: [6],
            nameOrTrait: [{ tokens: ["Greymon", "Garurumon"], match: "name" }],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              payCost: true,
              materials: { count: 1, includeRef: "triggerSubject", filter: { controller: "mine", kind: ["Digimon"] } },
              looseMaterials: {
                count: 1,
                from: ["hand"],
                filter: { zone: "hand", controller: "mine", kind: ["Digimon"] },
              },
              into: { nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }] },
            },
          ],
        },
      ],
    });
    expect(compiled.effects?.[0]?.actions?.[1]).not.toHaveProperty("optional");
  });

  it("arms the intrinsic Delay only for an owned level 6 Greymon or Garurumon leaving outside battle", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "instead",
      leaveCause: "otherThanBattle",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        levels: [6],
        nameOrTrait: [{ tokens: ["Greymon", "Garurumon"], match: "name" }],
      },
      actions: [{ kind: "DnaDigivolve", materials: { includeRef: "triggerSubject" } }],
    });
  });

  it("adds itself to hand after the Security Tamer play option", () => {
    expect(compiled.effects?.[2]).toMatchObject({
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

  it("uses the leaving Digimon as the first DNA material when intrinsic Delay activates", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-015", as: "leavingWarGreymon" },
            { card: "BT17-081", as: "colorTamer" },
          ],
          hand: [
            { card: "BT17-095", as: "option" },
            { card: "BT17-027", as: "looseMetalGarurumon" },
            { card: "EX4-060", as: "omnimon" },
          ],
        },
        1: {
          battleArea: ["BT17-019"],
          hand: [{ card: "BT10-098", as: "returner" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("returner").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX4-060"));

    const result = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX4-060");
    expect(result?.stack.some((card) => card.instanceId === s.inst("leavingWarGreymon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
  });

  it("does not consume intrinsic Delay without a separate hand material for the DNA recipe", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-015", as: "leavingWarGreymon" },
            { card: "BT17-081", as: "colorTamer" },
          ],
          hand: [
            { card: "BT17-095", as: "option" },
            { card: "EX4-060", as: "omnimon" },
          ],
        },
        1: {
          battleArea: ["BT17-019"],
          hand: [{ card: "BT10-098", as: "returner" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 10;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("returner").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("leavingWarGreymon").instanceId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
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
