import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-071.js";
import "./index.js";

describe("BT17-071 Murmukusmon", () => {
  it("limits the Darcmon evolution route to a base with HippoGryphonmon underneath", () => {
    expect(compiled.digivolutionRequirement).toContainEqual({
      names: ["Darcmon"],
      minNameStackCount: 1,
      minNameStackNames: ["HippoGryphonmon"],
      cost: 4,
      isAlternate: true,
    });
  });

  it("requires both stack names before playing Ornismon after deleting another Digimon", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0];
    expect(action).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      condition: {
        kind: "allOf",
        conditions: [
          {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Darcmon"], match: "name" }] },
          },
          {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["HippoGryphonmon"], match: "name" }] },
          },
        ],
      },
      cost: {
        kind: "deleteOwn",
        target: { filter: { controller: "mine", excludeSelf: true, zone: "battleArea" }, count: 1 },
      },
    });
  });

  it("deletes an opposing Digimon no higher than the Digimon deleted by the trigger", () => {
    const action = compiled.effects.find((entry) => entry.frequency === "OncePerTurn")?.actions[0];
    expect(action).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "mine", excludeSelf: true },
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", levelComparison: { op: "lte", relativeTo: "lastDeleted" } },
            count: 1,
          },
        },
      ],
    });
  });

  it("plays Ornismon from trash after the legal Darcmon/HippoGryphonmon evolution route", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-063", under: ["BT17-066"], as: "darcmon" },
            { card: "BT17-066", as: "ally" },
          ],
          hand: [{ card: "BT17-071", as: "murmukusmon" }],
          trash: [{ card: "BT17-072", as: "ornismon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredTargets },
    );
    s.state.memory = 4;
    preferredTargets.push(s.inst("ally").instanceId);
    const allyId = s.inst("ally").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("darcmon").permanentId,
        instanceId: s.inst("murmukusmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-072"));

    expect(s.perm("darcmon").topCard.cardId).toBe("BT17-071");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === allyId)).toBe(true);
    expect(s.perm("ornismon").topCard.cardId).toBe("BT17-072");
  });

  it("does not play Ornismon when only Darcmon is in the digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-066", as: "host" },
            { card: "BT17-064", as: "ally" },
          ],
          hand: [{ card: "BT17-071", as: "murmukusmon" }],
          trash: [{ card: "BT17-072", as: "ornismon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("murmukusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT17-071");

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("ally").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-072")).toBe(true);
  });

  it("deletes an opposing Digimon after a natural battle deletion, once per turn and within the level bound", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-071", as: "murmukusmon" },
            { card: "BT17-066", as: "firstAlly", suspended: true },
            { card: "BT17-066", as: "secondAlly", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT17-064", dp: 13000, as: "firstAttacker" },
            { card: "BT17-064", dp: 13000, as: "secondAttacker" },
            { card: "BT17-071", dp: 13000, as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredTargets },
    );
    preferredTargets.push(s.inst("firstAttacker").instanceId);
    const firstAttackerId = s.inst("firstAttacker").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstAlly").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2 && s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-066")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === firstAttackerId)).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooHigh").permanentId),
    ).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondAlly").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT17-066")).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.some(
        (permanent) => permanent.permanentId === s.perm("secondAttacker").permanentId,
      ),
    ).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooHigh").permanentId),
    ).toBe(true);
  });
});
