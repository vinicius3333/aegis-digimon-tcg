import { EffectTiming } from "@aegis/shared";
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

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("helloogarmon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-071"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === helloogarmonId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-071")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === higherId)).toBe(true);
  });

  it("deletes itself even when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-010", as: "helloogarmon" }] }, 1: {} });
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.EndOfOpponentsTurn, s.perm("helloogarmon"));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
