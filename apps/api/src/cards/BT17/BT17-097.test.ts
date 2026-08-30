import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-097.js";
import "./index.js";

describe("BT17-097 Return to the Primogenitor", () => {
  it("keeps the Main digivolution requirement and places the Option afterward", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          reduceCost: 4,
          optional: true,
          into: {
            kind: ["Digimon"],
            levelComparison: { op: "gte", value: 5 },
            nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("uses the intrinsic Delay replacement only for another effect's deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "Replacement", event: "wouldBeDeleted", leaveCause: "otherThanYourEffect" }],
    });
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: false,
          bindResultAs: "digivolvedToPreventDeletion",
          target: {
            filter: {
              useTriggerSource: true,
              zone: "battleArea",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
            },
          },
          into: { nameOrTrait: [{ tokens: ["Imperialdramon"], match: "name" }] },
        },
        { kind: "Prevent", condition: { kind: "bindingExists", ref: "digivolvedToPreventDeletion" } },
      ],
    });
  });

  it("keeps the Security Tamer recovery path scoped to Davis or Ken", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          optional: true,
          target: {
            filter: { kind: ["Tamer"], nameOrTrait: [{ tokens: ["Davis Motomiya", "Ken Ichijoji"], match: "name" }] },
          },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
  });

  it("places itself after the optional Main evolution is declined", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT17-019", "BT17-030"], hand: [{ card: "BT17-097", as: "option" }] } },
      { autoDeclineOptional: true },
    );
    s.state.memory = 2;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === optionId)).toBe(true);
  });

  it("naturally evolves one legal level 5 or higher Free Digimon for four less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-014", as: "base" },
            { card: "BT17-019", as: "colorSource" },
            { card: "BT17-036", as: "greenColorSource" },
          ],
          hand: [
            { card: "BT17-097", as: "option" },
            { card: "BT3-017", as: "valkyrimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "BT3-017");

    expect(s.perm("base").topCard?.cardId).toBe("BT3-017");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-097")).toBe(true);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("valkyrimon").instanceId)).toBe(false);
  });

  it("naturally digivolves the Free Digimon being deleted by an opponent effect and prevents deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-028", as: "freeTarget" }],
          hand: [{ card: "BT17-097", as: "option" }],
        },
        1: {
          hand: [{ card: "BT17-017", as: "opponentEffect" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const optionId = s.inst("option").instanceId;
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId));
    s.give(0, "hand", { card: "BT12-030", as: "imperialdramon" });
    await s.ready();
    s.state.turnCount += 1;
    s.state.turnSeat = 1;
    s.state.memory = 20;

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("freeTarget").topCard?.cardId === "BT12-030");

    expect(s.perm("freeTarget").topCard?.cardId).toBe("BT12-030");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("imperialdramon").instanceId)).toBe(
      false,
    );
  });

  it("naturally plays a Davis or Ken card from Security, then places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT17-097", as: "securityOption" }],
          hand: [{ card: "BT12-090", as: "davis" }],
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
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-097") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-090"),
    );

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT17-097")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-090")).toBe(true);
  });
});
