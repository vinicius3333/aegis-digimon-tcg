import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_054 } from "./BT24-054.js";
import "../index.js";

describe("BT24-054 Ryudamon", () => {
  it("limits the inherited suspension target by this Digimon's play cost", () => {
    const inherited = BT24_054.effects?.find((entry) => entry.isInherited);
    expect((inherited?.actions?.[0] as any).actions?.[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLteTriggerSource: true } },
    });
  });
  it("responds to your Shuu Yulin being played with optional Hisyaryumon digivolution", () => {
    const effect = BT24_054.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed" });
    expect((effect?.actions?.[0] as any).actions?.[0]).toMatchObject({
      kind: "Digivolve",
      payCost: true,
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
    });
  });

  it("digivolves from exact Kyokyomon for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT24-005", as: "kyokyomon" },
        hand: [{ card: "BT24-054", as: "ryudamon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyokyomon").permanentId,
        instanceId: s.inst("ryudamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kyokyomon").topCard.instanceId === s.inst("ryudamon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("evolves itself into exact Hisyaryumon for cost 3 when Shuu Yulin is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-054", as: "ryudamon" }],
          hand: [
            { card: "BT15-087", as: "shuu" },
            { card: "BT24-060", as: "hisyaryumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("shuu").instanceId], "BT24-054");
    await settle(() => s.perm("ryudamon").topCard.instanceId === s.inst("hisyaryumon").instanceId);

    expect(s.state.memory).toBe(7);
  });

  it("inherited effect suspends only a target within its host's play cost when that host suspends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-055", as: "host", under: ["BT24-054"] }] },
        1: {
          battleArea: [
            { card: "BT1-088", as: "low" },
            { card: "BT24-051", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("high").topCard.instanceId, s.perm("low").topCard.instanceId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);

    expect(s.perm("low").isSuspended).toBe(true);
    expect(s.perm("high").isSuspended).toBe(false);
  });

  it("inherited effect ignores a neighboring Digimon's suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-055", as: "host", under: ["BT24-054"] },
            { card: "BT1-009", as: "neighbor" },
          ],
        },
        1: { battleArea: [{ card: "BT1-088", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("neighbor").permanentId]);

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
