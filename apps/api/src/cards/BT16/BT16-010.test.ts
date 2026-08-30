import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-010.js";
import "../index.js";

describe("BT16-010", () => {
  it("has Retaliation and deletes the lowest-DP opposing Digimon by deleting itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Retaliation" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete", cost: { kind: "deleteOwn" }, optional: false }],
    });
  });
  it("may play a Loogamon or Eiji Nagasumi from trash on deletion", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
    }));

  it("deletes itself, deletes the lowest-DP opponent, and plays Loogamon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-010", as: "helloogarmon" }],
          trash: [{ card: "BT14-071", as: "loogamon" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest", dp: 3000 },
            { card: "BT1-009", as: "higher", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const helloogarmonId = s.perm("helloogarmon").permanentId;
    const lowestId = s.perm("lowest").permanentId;
    const higherId = s.perm("higher").permanentId;

    await advance(s.engine).runTurn(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-071"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === helloogarmonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-071")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === higherId)).toBe(true);
  });

  it("deletes itself even when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-010", as: "helloogarmon" }] }, 1: {} });
    s.state.turnSeat = 1;

    await advance(s.engine).runTurn(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("digivolves from a level-4 SoC Digimon for 3 memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-074", as: "base" }],
        hand: [{ card: "BT16-010", as: "helloogarmon" }],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("helloogarmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-010");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.some((card) => card.cardId === "BT14-074")).toBe(true);
  });

  it("uses Retaliation to delete an opposing Digimon after losing a natural battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT16-010", as: "helloogarmon", dp: 3000 }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", dp: 4000, suspended: true }] },
    });
    const defenderInstanceId = s.perm("defender").topCard.instanceId;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("helloogarmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 0 &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.trash.some((card) => card.instanceId === defenderInstanceId),
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("may decline the optional Loogamon play after a natural deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-010", as: "helloogarmon", dp: 3000, suspended: true }],
          trash: [{ card: "BT14-071", as: "loogamon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 4000 }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    const loogamonInstanceId = s.inst("loogamon").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("helloogarmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === loogamonInstanceId)).toBe(true);
  });
});
