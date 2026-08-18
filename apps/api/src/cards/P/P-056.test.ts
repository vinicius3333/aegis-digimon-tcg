import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-056.js";

describe("P-056 Rosemon", () => {
  it("applies both attack and block restrictions to the same chosen Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-056", as: "source" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "unchosen" },
            { card: "BT1-009", as: "chosen" },
          ],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("chosen"), "attack") &&
        observe(s.engine).isRestricted(s.perm("chosen"), "block"),
    );

    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("unchosen"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("unchosen"), "block")).toBe(false);
  });

  it("does not restrict any Digimon without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-011", as: "base" }],
          hand: [{ card: "P-056", as: "source" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(false);
  });

  it("Digisorption suspends 1 own Digimon and reduces the digivolution cost by 2", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT1-067", as: "digisorption-cost" },
          ],
          hand: [{ card: "P-056", as: "source" }],
          deck: ["BT1-009"],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("digisorption-cost").topCard!.instanceId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("digisorption-cost").isSuspended && s.state.memory === 8);

    expect(s.perm("digisorption-cost").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8); // Printed cost 4, reduced by Digisorption -2.
  });
});
