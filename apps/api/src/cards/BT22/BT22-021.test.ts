import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-021.js";

describe("BT22-021 Shellmon", () => {
  it("supports Decode, bottom placement from hand on both triggers, and inherited Jamming", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.3 w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "PlaceUnder",
        target: {
          filter: { zone: "hand", controller: "mine", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
          from: ["hand"],
          count: 1,
        },
        underFilter: { controller: "mine", kind: ["Digimon"] },
        position: "bottom",
        optional: true,
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
  });

  it("places an Aquatic level-3 peer under the chosen host and exposes inherited Jamming", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-021", as: "shellmon" },
            { card: "BT1-033", as: "host" },
          ],
          hand: [
            { card: "BT18-020", as: "aquatic" },
            { card: "BT22-052", as: "tooHigh" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("aquatic").instanceId, s.perm("host").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shellmon"));

    expect(s.perm("host").stack.at(-1)?.instanceId).toBe(s.inst("aquatic").instanceId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
  });

  it("grants inherited Jamming from an evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-033", under: ["BT22-021"], as: "host" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
