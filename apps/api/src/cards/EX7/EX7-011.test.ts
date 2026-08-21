import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-011.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-011 Megadramon", () => {
  it("deletes a 6000 DP or lower opposing Digimon by placing a Three Musketeers Option under itself on play/digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } }, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self", target: { from: ["hand", "trash"] } } });
  });
  it("inherits Piercing", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords?.[0]?.keyword).toBe("Piercing"));

  it("places a Three Musketeers Option from hand and deletes an opposing Digimon at 6000 DP", async () => {
    const s = setupEngine({
      0: { hand: ["EX7-071"], battleArea: [{ card: "EX7-011", as: "megadramon" }] },
      1: { battleArea: [{ card: "BT1-009", dp: 6000, as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("megadramon"));
    await settle(() => s.state.players[0].battleArea[0]!.stack.some((card) => card.cardId === "EX7-071") && s.state.players[1].battleArea.length === 0);
    expect(s.state.players[0].battleArea[0]!.stack.some((card) => card.cardId === "EX7-071")).toBe(true);
    expect(s.state.players[1].battleArea).toHaveLength(0);
  });
});
