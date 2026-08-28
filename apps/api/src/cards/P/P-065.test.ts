import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-065.js";

describe("P-065 Gammamon", () => {
  it("deletes an opponent Digimon with 2000 DP or less on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-065", as: "source" }] },
        1: {
          battleArea: [
            { card: "ST1-03", as: "eligible", dp: 2000 },
            { card: "BT1-009", as: "safe", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const eligibleId = s.perm("eligible").permanentId;
    const safeId = s.perm("safe").permanentId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === safeId)).toBe(true);
  });

  it("uses the inherited When Attacking effect and keeps targets above 2000 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "attacker", under: ["P-065"] }] },
        1: {
          security: ["BT1-028"],
          battleArea: [
            { card: "ST1-03", as: "eligible", dp: 2000 },
            { card: "BT1-009", as: "safe", dp: 3000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").topCard!.instanceId);
    const eligibleId = s.perm("eligible").permanentId;
    const safeId = s.perm("safe").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId));

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === eligibleId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === safeId)).toBe(true);
  });
});
