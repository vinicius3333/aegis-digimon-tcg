import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-016.js";
import "../index.js";

describe("EX4-016 Greymon", () => {
  it("reveals three and adds Kiriha plus a blue or black card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "name", tokens: ["Kiriha Aonuma"] }] } },
        { count: 1, to: "hand", filter: { colors: ["Blue", "Black"], hasDigiXrosRequirements: true } },
      ],
      rest: "trash",
    });
  });
  it("has Save and inherited attack draw", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.keywords).toMatchObject([
      { keyword: "Save" },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      isInherited: true,
      actions: [{ kind: "Draw", amount: 1 }],
    });
  });

  it("adds Kiriha and a blue DigiXros card from the top three and trashes the rest", async () => {
    const s = setupEngine(
      { 0: { deck: ["BT10-088", "BT10-024", "BT1-010"], battleArea: [{ card: "EX4-016", as: "greymon" }] } },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("greymon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-088"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-088")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-024")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("does not select a blue card without DigiXros requirements", async () => {
    const s = setupEngine(
      { 0: { deck: ["BT10-088", "BT10-024", "BT10-019"], battleArea: [{ card: "EX4-016", as: "greymon" }] } },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("greymon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-088"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT10-088", "BT10-024"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT10-019")).toBe(true);
  });
});
