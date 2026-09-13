import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-049.js";
import "./EX6-051.js";

describe("EX6-049 Devimon", () => {
  it("deletes a level 3 opponent Digimon when their hand has five or fewer cards and trashes their hand at seven or more", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Delete", condition: { kind: "zoneCount", op: "lte", value: 5 } },
      { kind: "Trash", chooser: "opponent", condition: { kind: "zoneCount", op: "gte", value: 7 } },
    ]));
  it("inherits +1000 DP while the opponent has six or fewer cards", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "zoneCount", op: "lte", value: 6 } },
      ],
    }));
  it("publicly plays Devimon, pays 5 memory, and deletes an opposing level 3 at five cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX6-049", as: "devimon" }] },
        1: { hand: Array.from({ length: 5 }, () => "BT1-010"), battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("devimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("devimon") !== undefined);
    expect(s.state.memory).toBe(5);
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("applies the inherited DP aura at six cards and only on the owner's Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-051", as: "devimon", under: ["EX6-049"] }] },
      1: { hand: Array.from({ length: 6 }, () => "BT1-010") },
    });
    s.state.turnSeat = 0;
    await s.ready();
    expect(s.perm("devimon").currentDP).toBe(8000);
    s.state.turnSeat = 1;
    expect(s.perm("devimon").currentDP).toBe(8000);
  });

  it("does not apply the inherited DP aura at seven opponent cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX6-051", as: "devimon", under: ["EX6-049"] }] },
      1: { hand: Array.from({ length: 7 }, () => "BT1-010") },
    });
    await s.ready();
    expect(s.perm("devimon").currentDP).toBe(7000);
  });
  it("publicly takes the seven-card branch instead of deleting at the high boundary", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-049", as: "devimon" }] },
        1: { hand: Array.from({ length: 7 }, () => "BT1-010"), battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("devimon"));
    await settle(() => s.state.players[1]!.hand.length === 6);
    expect(s.state.players[1]!.hand).toHaveLength(6);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
