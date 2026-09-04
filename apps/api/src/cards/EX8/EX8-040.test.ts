import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./index.js";
import { compiled } from "./EX8-040.js";

describe("EX8-040", () => {
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", amount: 2000 }],
    }));
  it("may suspend one Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Suspend",
      optional: true,
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Suspend",
      optional: true,
      target: { count: 1 },
    });
  });
  it("suspends the forced opposing Digimon on play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      { 0: { hand: [{ card: "EX8-040", as: "kab" }] }, 1: { battleArea: [{ card: "AD1-001", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").permanentId);
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kab").instanceId })).toEqual({ ok: true });
    await settle(
      () =>
        player.battleArea.some((p) => p.topCard?.cardId === "EX8-040") &&
        s.state.players[1]!.battleArea[0]!.isSuspended,
    );
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
  });

  it("does not suspend a Digimon when the optional On Play effect is declined", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX8-040", as: "kab" }] }, 1: { battleArea: [{ card: "AD1-001", as: "target" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kab").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX8-040"));
    expect(s.perm("target").isSuspended).toBe(false);
  });
  it("evolves from an off-color NSp rookie and suspends an allied Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-015", as: "base" },
            { card: "BT1-071", as: "target" },
          ],
          hand: [{ card: "EX8-040", as: "kab" }],
          deck: ["BT1-045"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").permanentId);

    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kab").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("base").topCard.cardId).toBe("EX8-040");
    expect(s.perm("base").stack.map((card) => card.cardId)).toContain("EX7-015");
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-045"]);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("rejects an off-color rookie without NSp", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX8-040", as: "kab" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kab").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("applies its inherited DP grant only during the host controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT11-053", as: "host", under: ["EX8-040"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(12000);
    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(10000);
  });
});
