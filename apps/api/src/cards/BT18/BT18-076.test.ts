import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT18-076.js";

describe("BT18-076 Loweemon", () => {
  it("draws one and trashes one card when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-076", as: "lowee" }], hand: [{ card: "BT1-030", as: "kept" }, { card: "BT1-028", as: "discarded" }], deck: ["BT1-032"] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.WhenDigivolving, s.perm("lowee").topCard!);
    await s.ready();
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-028", "BT1-032"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-030")).toBe(true);
    expect(runtimeCompiledCard("BT18-076")!.effects[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash" }] });
  });
});
