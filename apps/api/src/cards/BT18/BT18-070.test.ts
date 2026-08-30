import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-070.js";
import "./BT18-067.js";
import "./BT18-070.js";

describe("BT18-070 RhinoKabuterimon", () => {
  it("uses its hand Main effect to place Beetlemon and MetalKabuterimon under a Tamer and digivolve it", async () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "DigivolveViaPlacement",
          placeCost: { target: { count: 2, requiredNamesExact: ["Beetlemon", "MetalKabuterimon"] } },
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-091", as: "tamer" }],
          hand: [{ card: "BT18-070", as: "rhino" }],
          trash: [
            { card: "BT18-063", as: "beetlemon" },
            { card: "BT18-067", as: "metalKabuterimon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.inst("rhino").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(effects).toHaveLength(1);

    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("rhino").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tamer").topCard?.cardId === "BT18-070");
    await s.ready();

    expect(s.perm("tamer").topCard?.cardId).toBe("BT18-070");
    // Stack arrays are bottom-to-top; the primitive inserts each bottom placement in order,
    // so the later selected material is the lower card.
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT18-067", "BT18-063", "BT18-091"]);
    expect(observe(s.engine).hasKeyword(s.perm("tamer"), "Collision")).toBe(true);
  });

  it("requires one Beetlemon and one MetalKabuterimon rather than two same-name cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-091", as: "tamer" }],
          hand: [{ card: "BT18-070", as: "rhino" }],
          trash: [
            { card: "BT18-063", as: "firstBeetlemon" },
            { card: "BT18-063", as: "secondBeetlemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effects = JSON.parse(s.inst("rhino").activatableEffectsJson || "[]") as { effectKey: string }[];
    const trashBefore = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);

    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("rhino").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await s.ready();

    expect(s.perm("tamer").topCard?.cardId).toBe("BT18-091");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT18-070");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(trashBefore);
    expect(s.state.memory).toBe(10);
  });

  it("applies inherited once-per-turn -4000 DP to an opposing Digimon when the host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-030", as: "host", under: ["BT18-070"] }] },
        1: { battleArea: [{ card: "BT1-078", as: "target" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const targetInitialDP = s.perm("target").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === targetInitialDP - 4000);

    expect(s.perm("target").currentDP).toBe(targetInitialDP - 4000);
  });
});
