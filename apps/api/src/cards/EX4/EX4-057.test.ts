import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-057.js";

describe("EX4-057 Antylamon", () => {
  it("exposes the parenthetical Alliance keyword as a static ability", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([
      { keyword: "Alliance" },
    ]);
  });
  it("plays a green level three from trash and returns a green Digimon once per turn", () => {
    const effects = compiled.effects?.filter((entry) => entry.trigger === "EndOfAttack");
    expect(effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { colors: ["Green"], levels: [3] } },
    });
    expect(effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { zone: "trash", colors: ["Green"] } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-057");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("digivolves from a green two-color level-four for the alternate cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-054", as: "wendigomon" }],
        hand: [{ card: "EX4-057", as: "antylamon" }],
      },
    });
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wendigomon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wendigomon").topCard?.cardId === "EX4-057");
    expect(s.perm("wendigomon").topCard?.cardId).toBe("EX4-057");
    expect(s.state.memory).toBe(0);
  });

  it("uses a real Alliance attack to suspend an ally and add its DP and Security Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-057", as: "attacker", dp: 8000 },
            { card: "BT1-010", as: "fodder", dp: 2000 },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-021", as: "target", dp: 12000, suspended: true },
            { card: "ST18-07", as: "blocker", dp: 7000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("attacker").keywords).toContain("Alliance");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("fodder").permanentId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() => {
      const activeCombat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
      return s.perm("fodder").isSuspended && activeCombat.hasOpenBlockWindow;
    });
    expect(s.perm("fodder").isSuspended).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(10000);
    expect(s.perm("attacker").securityAttack).toBe(2);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
  });

  it("plays a green level-three from trash at end of attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-057", as: "attacker" },
            { card: "BT1-010", as: "suspended", suspended: true },
          ],
          trash: [{ card: "BT1-064", as: "playedGreen" }],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-064"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-064")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("playedGreen").instanceId)).toBe(false);
  });

  it("returns a green Digimon from trash once per turn through an Antylamon stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-025", as: "attacker", under: ["EX4-057"] },
            { card: "BT1-010", as: "suspended", suspended: true },
          ],
          trash: [
            { card: "BT1-064", as: "returnedGreen" },
            { card: "BT1-064", as: "returnedGreen2" },
          ],
        },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnedGreen").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnedGreen").instanceId)).toBe(true);
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 0;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 3;
    await s.ready();
    s.perm("attacker").isSuspended = false;
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnedGreen2").instanceId),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnedGreen2").instanceId)).toBe(true);
  });

  it("does not play the optional green level-three when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-057", as: "attacker" }],
          trash: [{ card: "BT1-064", as: "greenTrash" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-064")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("greenTrash").instanceId)).toBe(true);
  });
  ex4CardBehaviorTests("EX4-057");
});
