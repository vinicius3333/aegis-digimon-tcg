import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-031.js";

describe("BT3-031 Imperialdramon: Dragon Mode", () => {
  it("reduces its cost and unsuspends all Digimon with Jamming", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-027", as: "base", suspended: true },
            { card: "BT3-021", as: "target", suspended: true },
          ],
          hand: [{ card: "BT3-031", as: "evolving" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("target").isSuspended && s.state.memory === 0);
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("pays the full cost over a level 5 that is neither Paildramon nor Dinobeemon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-038", as: "base" },
          { card: "BT3-027", as: "unrelatedPaildramon" },
        ],
        hand: [{ card: "BT3-031", as: "evolving" }],
      },
    });
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT3-031");

    expect(s.state.memory).toBe(1);
  });

  it("Q1067 pays the full cost over Paildramon in the breeding area", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT3-027", as: "base" },
        hand: [{ card: "BT3-031", as: "evolving" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT3-031");

    expect(s.state.memory).toBe(0);
  });

  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-031", as: "imperial" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("imperial"), "Jamming")).toBe(true);
  });
});
