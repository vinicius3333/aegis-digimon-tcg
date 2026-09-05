import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-066.js";
import "../index.js";

describe("EX5-066 Phoebus Blow", () => {
  it("deletes the opponent's lowest-DP Digimon and returns a Light Fang/Night Claw Digimon if you have a Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      {
        kind: "Delete",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestDP" } },
      },
      {
        kind: "Return",
        to: "hand",
        condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Tamer"] } },
        target: {
          count: 1,
          filter: {
            zone: "trash",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Night Claw"] }],
          },
        },
      },
    ]);
  });
  it("activates its Main effect from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain"));

  it("deletes the lowest-DP opponent and returns a matching trait card through public Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-064", as: "tamer" }],
          hand: [{ card: "EX5-066", as: "option" }],
          trash: [
            { card: "EX5-007", as: "returnTarget" },
            { card: "BT1-009", as: "nonMatch" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 2000, as: "lowest" },
            { card: "BT1-020", dp: 9000, as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const lowestId = s.perm("lowest").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX5-007"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowestId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-020")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX5-007")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("returns the trait card even when no opposing Digimon exists, per Q3671", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX5-064", as: "tamer" }],
        hand: [{ card: "EX5-066", as: "option" }],
        trash: [{ card: "EX5-007", as: "returnTarget" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX5-007"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX5-007")).toBe(true);
  });

  it("does not return a trait card without a Tamer, while still deleting the lowest target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "colorSource" }],
          hand: [{ card: "EX5-066", as: "option" }],
          trash: [{ card: "EX5-007", as: "returnTarget" }],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 2000, as: "lowest" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    const lowestId = s.perm("lowest").permanentId;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowestId));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX5-007")).toBe(true);
  });

  it("activates its Main effect when revealed in Security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-064", as: "tamer" }],
          security: [{ card: "EX5-066", as: "option" }],
          trash: ["EX5-007"],
        },
        1: { battleArea: [{ card: "BT1-009", dp: 2000, as: "lowest" }] },
      },
      { autoSelectCards: true },
    );
    const lowestId = s.perm("lowest").permanentId;
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowestId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowestId)).toBe(false);
  });
});
