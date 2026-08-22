import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT25-052.js";

describe("BT25-052 Logimon", () => {
  it("links an eligible Appmon from hand and plays Kazuki & Itsuki when linked", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-052", as: "logimon" }], hand: [{ card: "BT25-061", as: "link" }, { card: "BT25-089", as: "kazuki" }] }, 1: { battleArea: [{ card: "BT25-046", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { linkedInstanceIds: [s.inst("link").instanceId] });
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT25-089")).toBe(true);
  });

  it("keeps the App Fusion requirement and once-per-turn link timing", () => {
    const card = runtimeCompiledCard("BT25-052");
    expect(card).toMatchObject({ appFusionRequirement: [{ names: ["Onmon", "Gatchmon"], cost: 0 }] });
    expect(card?.effects.some((effect) => effect.trigger === "Main" && effect.frequency === "OncePerTurn")).toBe(true);
  });
});
