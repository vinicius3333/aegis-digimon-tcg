import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-051.js";

describe("BT10-051 SymbareAngoramon", () => {
  it("matches its catalog and exact inherited once-per-turn watcher", () => {
    const d = getCardDefinition("BT10-051")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Green"], 4, 5, 6000]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 3, memoryCost: 2 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Champion"], ["Vaccine"], ["Beastkin"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended" })],
      }),
    ]);
  });

  it("gains exactly 1 memory only on the first opposing Digimon suspension each turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-054", as: "host", under: ["BT10-051"] }] },
      1: {
        battleArea: [
          { card: "BT10-020", as: "firstTarget" },
          { card: "BT10-020", as: "secondTarget" },
        ],
      },
    });
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).verb.suspend([s.perm("firstTarget").permanentId]);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.suspend([s.perm("secondTarget").permanentId]);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not trigger when one of its controller's Digimon is suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-051"] },
          { card: "BT10-020", as: "ally" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);

    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("does not trigger during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-054", as: "host", under: ["BT10-051"] }] },
      1: { battleArea: [{ card: "BT10-020", as: "target" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("target").permanentId]);

    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
