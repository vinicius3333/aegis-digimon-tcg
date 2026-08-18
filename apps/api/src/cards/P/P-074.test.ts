import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-074.js";

describe("P-074 Boutmon", () => {
  it("trashes a chosen 3 security to make an otherwise unaffordable Shaman digivolution cost 1", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-074", as: "boutmon" }],
          hand: [{ card: "BT10-042", as: "venusmon" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 3 },
    );
    s.state.memory = 1;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("boutmon").permanentId,
      instanceId: s.inst("venusmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("boutmon").topCard.cardId === "BT10-042");

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("may choose zero security and pay the full Shaman digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-074", as: "boutmon" }],
          hand: [{ card: "BT10-042", as: "venusmon" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
          deck: ["BT1-004"],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0 },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("boutmon").permanentId,
      instanceId: s.inst("venusmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("boutmon").topCard.cardId === "BT10-042");

    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(0);
  });

  it("does not offer the security reduction for a non-Shaman/non-Wizard evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-074", as: "boutmon" }],
        hand: [{ card: "BT2-041", as: "shineGreymon" }],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("boutmon").permanentId,
      instanceId: s.inst("shineGreymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("boutmon").topCard.cardId === "BT2-041");

    expect(s.decisions.filter(({ req }) => req.kind === "chooseOption")).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.memory).toBe(-3);
  });

  it("unsuspends its host once per turn only at exactly 3 security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-057", as: "host", under: ["P-074"] }], security: 3 },
      1: { battleArea: [
        { card: "BT1-009", as: "first", suspended: true, dp: 1000 },
        { card: "BT1-010", as: "second", suspended: true, dp: 1000 },
      ] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack", attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("first").permanentId },
    })).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    await settle();

    expect(s.engine.applyIntent(0, {
      type: "attack", attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("second").permanentId },
    })).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").isSuspended).toBe(true);
  });
});
