import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST21-02 Gomamon", () => {
  it("matches the All Turns memory restriction and Tamer exception", () => {
    const action = runtimeCompiledCard("ST21-02")?.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];

    expect(action).toEqual({
      kind: "RestrictMemoryGain",
      seat: "opponent",
      exceptTamerEffects: true,
      duration: "permanent",
    });
  });

  it("blocks opponent Digimon-effect memory gain but exempts Tamers", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST21-02", as: "gomamon" }] } });
    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    const ledger = (s.engine as unknown as { continuous: { canGainMemoryFromEffect: (seat: number, source: { definition: { kinds: string[] } }) => boolean } }).continuous;

    expect(ledger.canGainMemoryFromEffect(1, { definition: { kinds: ["Digimon"] } })).toBe(false);
    expect(ledger.canGainMemoryFromEffect(1, { definition: { kinds: ["Tamer"] } })).toBe(true);
    expect(ledger.canGainMemoryFromEffect(0, { definition: { kinds: ["Digimon"] } })).toBe(true);
  });
});
