import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT18-077.js";

describe("BT18-077 KaiserLeomon", () => {
  it("deletes exactly one opposing level 4 Digimon and has Retaliation", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-077", as: "kaiser" }] },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.OnPlay, s.perm("kaiser").topCard!);
    await s.ready();
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-032")).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-032")).toBe(true);
    expect(runtimeCompiledCard("BT18-077")!.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Retaliation" }],
    });
  });
});
