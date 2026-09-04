import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-029.js";

describe("EX6-029 Mastemon", () => {
  it("has Blast DNA Digivolve and plays a level 5 or lower Angel-family Digimon from hand or trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDNADigivolve",
    );
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand", "trash"],
      payCost: false,
      optional: true,
      target: { filter: { levelComparison: { op: "lte", value: 5 } } },
    });
  });
  it("during DNA digivolving mandatorily places a Digimon into security and trashes until four remain", () => {
    const tail = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions.slice(1);
    expect(tail).toMatchObject([
      {
        kind: "SecurityManipulation",
        op: "placeAsSecurity",
        condition: { kind: "isDnaDigivolving" },
        from: ["battleArea"],
        toTop: false,
        ownerSecurity: true,
      },
      {
        kind: "SecurityManipulation",
        op: "trashTop",
        leaveCount: 4,
        condition: { kind: "isDnaDigivolving" },
      },
    ]);
    expect(tail?.[0]).not.toHaveProperty("optional");
    expect(tail?.[1]).not.toHaveProperty("optional");
  });
  it("routes the selected other Digimon to its owner's security bottom through the executable security primitive", () => {
    const action = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[1];
    expect(action).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      from: ["battleArea"],
      toTop: false,
      ownerSecurity: true,
      source: { filter: { excludeSelf: true, kind: ["Digimon"] }, count: 1 },
    });
    expect(action).not.toHaveProperty("underFilter");
  });
  it("publicly plays an Angel-family Digimon from trash on play", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX6-029", as: "mast" }], trash: [{ card: "EX6-019", as: "angel" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("mast"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("angel").instanceId)).toBe(true);
  });
});
