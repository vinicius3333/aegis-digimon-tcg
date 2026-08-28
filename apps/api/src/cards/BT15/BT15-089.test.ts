import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-089.js";

describe("BT15-089", () => {
  it("matches the catalog identity and keeps the direct module full and residual-free", () => {
    expect(getCardDefinition("BT15-089")).toMatchObject({
      nameEn: "Meteor Wing",
      colors: ["Red"],
      kinds: ["Option"],
      playCost: 4,
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("lowers the deletion DP ceiling by 2000 per opposing security card", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { dp: { op: "lte", value: 15000 } } },
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      dpCeilingScaling: { amount: -2000, per: 1, unit: "security" },
    });
  });
  it("activates its main effect in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));

  it("naturally applies the opposing-security-scaled DP ceiling on Main", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT15-089", as: "meteor" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atCap", dp: 9000 },
            { card: "BT1-009", as: "aboveCap", dp: 11000 },
          ],
          security: ["BT1-001", "BT1-001", "BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meteor").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("atCap").permanentId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("aboveCap").permanentId)).toBe(true);
    expect(s.state.memory).toBe(6);
  });

  it("naturally activates Main from security during an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          security: [{ card: "BT15-089", as: "meteor" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "atCap", dp: 13000 },
            { card: "BT1-009", as: "aboveCap", dp: 14000 },
          ],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("atCap").permanentId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("aboveCap").permanentId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
