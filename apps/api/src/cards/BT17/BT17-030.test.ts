import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-030.js";
import "./index.js";

describe("BT17-030", () => {
  it("gains memory by placing Leon Alexander under itself", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "securityAtLeast", value: 3 },
      optional: true,
      abortOnDecline: true,
      cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
    });
  });

  it("adds a security card from deck when security is 2 or fewer and has inherited Pulsemon DP", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "addTop",
      controller: "mine",
      source: "deck",
      amount: 1,
      cost: { kind: "place" },
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }],
    });
  });

  it("places Leon Alexander and gains memory with at least 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-030", as: "pulsemon" }],
          hand: [{ card: "BT17-086", as: "leon" }],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const leonId = s.inst("leon").instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("pulsemon"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("pulsemon").stack.map((card) => card.instanceId)).toEqual([leonId]);
  });

  it("requires placing Leon Alexander before recovering at low security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-030", as: "pulsemon" }],
          hand: [{ card: "BT17-086", as: "leon" }],
          deck: [{ card: "BT1-011", as: "recovered" }],
          security: 2,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const recoveredId = s.inst("recovered").instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("pulsemon"));
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId));

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.perm("pulsemon").stack.at(0)?.cardId).toBe("BT17-086");
  });

  it("grants inherited DP only when the host text mentions Pulsemon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT17-034", dp: 6000, under: ["BT17-030"], as: "matching" },
          { card: "BT17-033", dp: 6000, under: ["BT17-030"], as: "nonMatching" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("matching").currentDP).toBe(7000);
    expect(s.perm("nonMatching").currentDP).toBe(6000);
  });
});
