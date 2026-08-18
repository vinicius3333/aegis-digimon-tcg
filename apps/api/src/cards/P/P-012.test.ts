import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-012.js";

describe("P-012 Tai Kamiya (V-Tamer)", () => {
  it("suspends itself to draw when a Veedramon-family Digimon is in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011" }, { card: "P-012", as: "tai" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoChooseOption: true },
    );
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("tai").topCard.instanceId,
      effectKey: "P-012/main",
    })).toEqual({ ok: true });
    await settle(() => s.perm("tai").isSuspended && s.state.players[0]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.perm("tai").isSuspended).toBe(true);
  });

  it("may give any own Digimon +1000 DP, not only the Veedramon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-011" },
            { card: "BT1-010", as: "recipient" },
            { card: "P-012", as: "tai" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("recipient").permanentId);
    const baseDP = s.perm("recipient").baseDP;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("tai").topCard.instanceId,
      effectKey: "P-012/main",
    })).toEqual({ ok: true });
    await settle(() => s.perm("recipient").currentDP === baseDP + 1000);

    expect(s.perm("recipient").currentDP).toBe(baseDP + 1000);
  });

  it("plays itself for free from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-012", as: "tai" }] },
      1: { battleArea: [{ card: "BT1-025", as: "attacker" }] },
    });
    const taiId = s.inst("tai").instanceId;
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === taiId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === taiId)).toBe(true);
  });
});
