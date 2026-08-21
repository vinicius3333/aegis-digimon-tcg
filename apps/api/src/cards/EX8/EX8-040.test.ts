import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-040.js";

describe("EX8-040", () => {
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000 }] }));
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
  it("suspends an allied Digimon when digivolving", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-040", as: "kab" },
            { card: "EX8-015", as: "target" },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").permanentId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kab"));
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });
});
