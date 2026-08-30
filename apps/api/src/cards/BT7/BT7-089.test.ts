import { requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-089.js";
import "./BT7-051.js";

describe("BT7-089 J.P. Shibayama", () => {
  it("reduces by 1 only when this Tamer digivolves into a green Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT7-089", as: "jp" },
          { card: "BT6-049", as: "otherBase" },
        ],
        hand: [
          { card: "BT7-046", as: "ontoTamer" },
          { card: "BT7-050", as: "ontoOther" },
        ],
        deck: ["BT7-045", "BT7-045"],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("otherBase").permanentId,
        instanceId: s.inst("ontoOther").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherBase").topCard.cardId === "BT7-050" && s.state.memory === 2);
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("jp").permanentId,
        instanceId: s.inst("ontoTamer").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("jp").topCard.cardId === "BT7-046" && s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("gives Piercing to the Digimon that has it as a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-050", under: ["BT7-089"], as: "host", dp: 9000 }] },
      1: {
        battleArea: [{ card: "BT6-049", as: "target", suspended: true, dp: 4000 }],
        security: [{ card: "BT1-010", as: "security" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("stops reducing evolution costs after J.P. becomes a digivolution card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-046", under: ["BT7-089"], as: "hybrid" }],
        hand: [{ card: "BT7-051", as: "rhino" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      advance(s.engine).ledgers.modifiers.evoCostFor(s.perm("hybrid"), requireCardDefinition("BT7-051")),
    ).toBeUndefined();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("hybrid").permanentId,
        instanceId: s.inst("rhino").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("hybrid").topCard.instanceId === s.inst("rhino").instanceId);

    // J.P.'s -1 no longer applies from the inherited stack. Rhino's own hand-resident
    // reducer still sees the Tamer card in the stack, so its printed cost 3 becomes 1.
    expect(s.state.memory).toBe(2);
  });
});
