import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-024.js";
import "./index.js";

describe("BT17-024", () => {
  it("gains Jamming on play or digivolution by placing a level 3 blue Digimon under itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Jamming" },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place" },
        },
      ],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Jamming" },
          duration: "forTheTurn",
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place" },
        },
      ],
    });
  });

  it("has inherited Jamming", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Jamming" }],
    });
  });

  it("grants inherited Jamming to its host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-025", as: "host", under: ["BT17-024"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("places a level 3 blue Digimon and grants Jamming on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: "BT1-029", as: "material" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    const materialId = s.inst("material").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seasarmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("seasarmon").stack.some((card) => card.instanceId === materialId));

    expect(s.perm("seasarmon").stack.some((card) => card.instanceId === materialId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("seasarmon"), "Jamming")).toBe(true);
  });

  it("places a level 3 blue Digimon and grants Jamming when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-029", as: "base" }],
          hand: [
            { card: "BT17-024", as: "seasarmon" },
            { card: "BT17-021", as: "material" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    const materialId = s.inst("material").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("seasarmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === materialId));

    expect(s.perm("base").stack.some((card) => card.instanceId === materialId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Jamming")).toBe(true);
  });
});
