import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-084.js";

describe("BT8-084 Kimeramon", () => {
  it("places a level-5-or-lower Digimon from trash under itself and reduces DP per resulting color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "base" }],
          hand: [{ card: "BT8-084", as: "evolving" }],
          trash: [{ card: "BT2-024", as: "blueSource" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "first" },
            { card: "BT2-047", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT8-084"));
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT2-024", "AD1-001"]);
    expect(s.perm("base").stack[0]?.instanceId).toBe(s.inst("blueSource").instanceId);
    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(3000);
  });

  it("excludes a face-down stack color from the When Digivolving reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-084",
              as: "kimeramon",
              under: [{ card: "BT1-009", faceUp: false }, "BT2-024"],
            },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kimeramon"));

    // White (printed) + blue (face-up stack) = -2000; hidden red must not count.
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("counts only the printed white color for When Digivolving on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT8-084",
              as: "kimeramon",
              under: [{ card: "BT1-009", faceUp: false }, "BT2-024"],
            },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kimeramon"));

    // BT8-084 is treated as its digivolution-card colors only during Your Turn.
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("is treated as all stack colors and gains +4000 DP at four colors during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-084", as: "kimeramon", under: ["BT8-013", "BT8-004", "BT8-005"] }] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("kimeramon").currentDP).toBe(12000);
  });
});
