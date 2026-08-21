import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-003.js";

describe("EX9-003", () => {
  it("inherits a once-per-turn Ver.3 digivolution cost reduction when it has a face-down digivolution card", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldDigivolve", sourceFilter: { hasFaceDownDigivolutionCard: true }, actions: [{ mode: "reduceCost", amount: 1 }] }] }));

  it("reduces a Ver.3 digivolution from 2 memory to 1 when the stack has a face-down card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-023", as: "host", under: [{ card: "EX9-003" }, { card: "BT1-009", faceUp: false }] }], hand: [{ card: "EX9-029", as: "evo" }] },
    });
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("evo").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX9-029");

    expect(s.perm("host").topCard?.cardId).toBe("EX9-029");
  });

  it("does not reduce a Ver.3 digivolution when the stack has no face-down card", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-023", as: "host", under: [{ card: "EX9-003" }, "BT1-009"] }], hand: [{ card: "EX9-029", as: "evo" }] },
    });
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("evo").instanceId,
    }).ok).toBe(true);
    expect(s.perm("host").topCard?.cardId).toBe("EX9-023");
  });
});
