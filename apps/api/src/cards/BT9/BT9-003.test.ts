import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../BT1/BT1-060.js";
import { compiled } from "./BT9-003.js";

function primitivesOf(setup: EngineSetup): Primitives {
  return (setup.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT9-003 Tokomon (X Antibody)", () => {
  it("matches the catalog and complete inherited security-add contract", () => {
    expect(getCardDefinition("BT9-003")).toMatchObject({
      cardId: "BT9-003",
      nameEn: "Tokomon (X Antibody)",
      colors: ["Yellow"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      evoCosts: [],
      forms: ["In-Training"],
      types: ["Lesser", "X Antibody"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When a card is added to your security stack, 1 of your opponent's Digimon gets -1000 DP for the turn.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenAddSecurity",
              fireCondition: { kind: "triggerSecurityIsYours" },
              actions: [
                {
                  kind: "ModifyDP",
                  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                  amount: -1000,
                  duration: "forTheTurn",
                },
              ],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("implements Q1796 after a net-neutral security remove and recovery sequence", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-034", as: "host", under: ["BT9-003"] }],
          deck: [{ card: "BT1-009", as: "recovered" }],
          security: [{ card: "BT1-010", as: "removed" }],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await primitivesOf(s).securityToHand(0, 1);
    await primitivesOf(s).addSecurity(0, [s.inst("recovered").instanceId], { toTop: true });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("triggers from a public On Play Recovery intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-034", as: "host", under: ["BT9-003"] }],
          hand: [{ card: "BT1-060", as: "magnaAngemon" }],
          deck: [{ card: "BT1-009", as: "recovered" }],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnaAngemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.state.players[0]!.security).toContainEqual(s.inst("recovered"));
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("chooses exactly one opposing Digimon and applies the exact -1000 boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-034", as: "host", under: ["BT9-003"] }],
          deck: [{ card: "BT1-009", as: "recovered" }],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "chosen" },
            { card: "BT1-028", as: "unchosen" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    await s.ready();
    await primitivesOf(s).addSecurity(0, [s.inst("recovered").instanceId]);
    await settle(() => s.perm("chosen").currentDP === 2000);
    expect(s.perm("chosen").currentDP).toBe(2000);
    expect(s.perm("unchosen").currentDP).toBe(3000);
  });

  it("is once per turn across multiple security additions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-034", as: "host", under: ["BT9-003"] }],
          deck: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
        1: { battleArea: [{ card: "BT1-028", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await primitivesOf(s).addSecurity(0, [s.inst("first").instanceId]);
    await primitivesOf(s).addSecurity(0, [s.inst("second").instanceId]);
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("ignores security added to the opponent and additions during the opponent's turn", async () => {
    for (const scenario of ["opponent-security", "opponent-turn"] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT9-034", as: "host", under: ["BT9-003"] }],
            deck: [{ card: "BT1-009", as: "mine" }],
          },
          1: {
            battleArea: [{ card: "BT1-028", as: "target" }],
            deck: [{ card: "BT1-010", as: "theirs" }],
          },
        },
        { autoSelectCards: true },
      );
      if (scenario === "opponent-turn") s.state.turnSeat = 1;
      await s.ready();
      const added = scenario === "opponent-security" ? s.inst("theirs") : s.inst("mine");
      const seat = scenario === "opponent-security" ? 1 : 0;
      await primitivesOf(s).addSecurity(seat, [added.instanceId]);
      await settle();
      expect(s.perm("target").currentDP).toBe(3000);
    }
  });
});
