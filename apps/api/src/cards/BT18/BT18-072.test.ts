import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-072.js";

describe("BT18-072 AncientBeetlemon", () => {
  it("de-digivolves two opponent Digimon by two cards each", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-072", as: "ancient" }] },
      1: { battleArea: [
        { card: "BT1-060", as: "first", under: ["BT1-030", "BT1-032"] },
        { card: "BT1-060", as: "second", under: ["BT1-030", "BT1-032"] },
      ] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("ancient").topCard!);
    await s.ready();
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    expect(compiled.effects[2]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "Replacement", event: "wouldLeavePlay" }] });
  });
});
