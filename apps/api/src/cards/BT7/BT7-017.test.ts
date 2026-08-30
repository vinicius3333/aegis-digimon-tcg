import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-017.js";

describe("BT7-017 Chaosdramon", () => {
  it("places a level-5 Cyborg as a source and deletes for each level-5 Cyborg source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [
            { card: "BT7-017", as: "evolving" },
            { card: "BT1-021", as: "cyborg" },
          ],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
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
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("cyborg").instanceId)).toBe(true);
  });

  it("can place the optional Cyborg source even when no deletion target exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "base" }],
          hand: [
            { card: "BT7-017", as: "evolving" },
            { card: "BT1-021", as: "cyborg" },
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
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === s.inst("cyborg").instanceId));
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("cyborg").instanceId)).toBe(true);
  });
});
