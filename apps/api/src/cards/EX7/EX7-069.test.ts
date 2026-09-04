import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-069.js";
import "../index.js";

describe("EX7-069 Wind Slicer", () => {
  it("suspends one level 6 or lower Digimon and unsuspends one of your Digimon if your Digimon was suspended", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "Suspend", optional: true },
      { kind: "Unsuspend", condition: { kind: "lastSuspendedIsMine" } },
    ]));
  it("activates its Main effect from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "ActivateMain" }));

  it("suspends your Digimon and then unsuspends one of your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-069", as: "wind" }],
          battleArea: [
            { card: "BT1-009", as: "own" },
            { card: "EX7-034", as: "color" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wind").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wind").instanceId));
    expect(s.perm("own").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wind").instanceId);
  });

  it("does not unsuspend your Digimon when the optional suspension targets only an opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-069", as: "wind" }],
          battleArea: [
            { card: "BT1-009", as: "own", suspended: true },
            { card: "EX7-034", as: "color" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 2;
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wind").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wind").instanceId));
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("own").isSuspended).toBe(true);
  });

  it("leaves a level-7 Digimon unaffected by the level-6 suspension ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-069", as: "wind" }],
          battleArea: [{ card: "EX7-034", as: "color" }],
        },
        1: { battleArea: [{ card: "EX7-037", as: "levelSeven" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wind").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wind").instanceId));
    expect(s.perm("levelSeven").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("levelSeven"), "unsuspend")).toBe(false);
  });

  it("activates Main from Security and suspends an eligible opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX7-069", as: "wind" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("wind"));
    expect(s.perm("opponent").isSuspended).toBe(true);
  });
});
