import { EffectTiming, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import compiled from "./BT3-096.js";
import "../ST2/ST2-13.js";

describe("BT3-096 Mimi Tachikawa", () => {
  it("matches official metadata and publishes the typed Option-use watcher", () => {
    expect(getCardDefinition("BT3-096")).toMatchObject({
      nameEn: "Mimi Tachikawa",
      colors: ["Purple"],
      playCost: 2,
      effectText: expect.stringContaining("When a player uses an Option card"),
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toEqual(getCompiledCard("BT3-096"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
  it("may suspend when an Option is used to gain 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-096", as: "mimi" },
            { card: "BT1-029", as: "blueSource" },
          ],
          hand: [{ card: "ST2-13", as: "hammerSpark" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("hammerSpark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mimi").isSuspended && s.state.memory === 2, 5000);

    expect(s.perm("mimi").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("offers each of 2 Mimis exactly once for a single Option use after recomputes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-096", as: "firstMimi" },
            { card: "BT3-096", as: "secondMimi" },
            { card: "BT1-029", as: "blueSource" },
          ],
          hand: [{ card: "ST2-13", as: "hammerSpark" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("hammerSpark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstMimi").isSuspended && s.perm("secondMimi").isSuspended && s.state.memory === 3);
    await s.ready();

    expect([s.perm("firstMimi").isSuspended, s.perm("secondMimi").isSuspended]).toEqual([true, true]);

    // Hammer Spark gains 1, then each independently ready Mimi may pay its suspend
    // cost exactly once for another +1. Duplicate watcher registrations must not
    // grant memory again after that copy is already suspended.
    expect(s.state.memory).toBe(3);

    const mimiPrompts = s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096");
    expect(mimiPrompts).toHaveLength(2);
  });

  it("cannot gain memory again from already suspended copies on a later Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-096", as: "firstMimi" },
            { card: "BT3-096", as: "secondMimi" },
            { card: "BT1-029", as: "blueSource" },
          ],
          hand: [
            { card: "ST2-13", as: "firstSpark" },
            { card: "ST2-13", as: "secondSpark" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstSpark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstMimi").isSuspended && s.perm("secondMimi").isSuspended && s.state.memory === 3);
    await s.ready();
    const afterFirstOption = s.state.memory;
    const promptsAfterFirstOption = s.decisions.filter(
      ({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096",
    ).length;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("secondSpark").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === afterFirstOption + 1);
    await s.ready();

    expect(s.state.memory).toBe(afterFirstOption + 1);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "BT3-096")).toHaveLength(
      promptsAfterFirstOption,
    );
  });

  it("plays itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT3-096", as: "securityTamer", faceUp: true }] } });
    const id = s.inst("securityTamer").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTamer"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
  });
});
