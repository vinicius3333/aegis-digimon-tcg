import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-071.js";

describe("BT18-071 ShadowSeraphimon", () => {
  it("de-digivolves exactly the selected opponent and retains Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-071", as: "shadow" }] },
        1: { battleArea: [{ card: "BT1-060", as: "target", under: ["BT1-030"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("shadow").topCard!);
    await s.ready();

    expect(s.perm("target").topCard!.cardId).toBe("BT1-030");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    );
  });
});
