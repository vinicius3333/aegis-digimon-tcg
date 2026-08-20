import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-038.js";

describe("EX8-038", () => {
  it("may suspend one Digimon on play", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Suspend", optional: true, target: { count: 1 } }));
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Retaliation", raw: "＜Retaliation＞" }));

  it("suspends a forced opposing Digimon on play", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine({ 0: { hand: [{ card: "EX8-038", as: "agumon" }] }, 1: { battleArea: [{ card: "AD1-001", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
    preferInstanceIds.push(s.perm("target").permanentId);
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((p) => p.topCard?.cardId === "EX8-038") && s.state.players[1]!.battleArea[0]!.isSuspended);
    expect(s.state.players[1]!.battleArea[0]!.isSuspended).toBe(true);
  });
});
