import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX6-059.js";

describe("EX6-059 Barbamon", () => {
  it("contains hand-trash revival, Scapegoat, and scaled play-cost IR", () => {
    const text = JSON.stringify(compiled);
    expect(compiled.coverage).toBe("full");
    expect(text).toContain("whenHandTrashed");
    expect(text).toContain("Scapegoat");
    expect(text).toContain("playCostLteScaling");
  });

  it("plays a purple card exactly at the scaled cost-9 ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-059", as: "barbamon" }], trash: ["BT10-012"] },
        1: { hand: [{ card: "BT1-010", as: "discard" }, "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-012"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT10-012")).toBe(true);
  });

  it("rejects an isolated purple card above the scaled cost-9 ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-059", as: "barbamon" }], trash: ["BT11-071"] },
        1: { hand: [{ card: "BT1-010", as: "discard" }, "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("discard").instanceId], 0);
    await settle(() => s.state.players[1]!.hand.length === 1);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT11-071"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["EX6-059"]);
  });
});
