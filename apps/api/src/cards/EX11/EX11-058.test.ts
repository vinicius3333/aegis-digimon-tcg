import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-058.js";

describe("EX11-058 Yao Qinglan", () => {
  it("places an Aqua or Sea Animal card under a matching Digimon and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "host" },
            { card: "EX11-058", as: "yao" },
          ],
          hand: ["BT23-023"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yao"));
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT23-023")).toBe(true);
  });
});
