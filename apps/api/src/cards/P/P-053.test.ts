import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-053.js";

describe("P-053 Ophanimon", () => {
  it("gives one opponent Digimon -5000 DP with a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-015", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-053", as: "source" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 5000);
    expect(s.perm("target").currentDP).toBe(5000);
  });

  it("does not give -5000 DP without a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "base" }],
          hand: [{ card: "P-053", as: "source" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
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
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("gives one opponent Digimon and all opponent Security Digimon -2000 DP when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-053", as: "attacker" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 6000 }],
          security: ["BT1-028"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 4000 && observe(s.engine).securityDp(1) === -2000);

    expect(s.perm("target").currentDP).toBe(4000);
    expect(observe(s.engine).securityDp(1)).toBe(-2000);
  });

  it("applies the Security Digimon reduction to the actual security battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-053", as: "ophanimon" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "effectTarget", dp: 6000 }],
          security: [{ card: "BT1-080", as: "securityDigimon" }],
        },
      },
      { autoSelectCards: true },
    );
    const attackerId = s.perm("ophanimon").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.security.length === 0 && s.events.some((event) => event.kind === "combatResolved"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("securityDigimon").instanceId)).toBe(
      true,
    );
  });
});
