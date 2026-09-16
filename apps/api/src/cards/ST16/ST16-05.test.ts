import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const GOTSUMON = "ST16-05";
const DUMMY = "BT1-009";

describe("ST16-05 [Your Turn] When attacking an opponent's Digimon, lose 2 memory", () => {
  it("loses 2 memory when attacking an opponent's Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: GOTSUMON, dp: 3000, as: "gotsumon" }],
          security: 3,
        },
        1: { battleArea: [{ card: DUMMY, dp: 2000, as: "oppTarget", suspended: true }], security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gotsumon").permanentId,
      target: { kind: "permanent", permanentId: s.perm("oppTarget").permanentId },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => s.state.memory !== 5, 400);

    expect(s.state.memory).toBe(3);
  });

  it("does NOT lose memory when attacking a player directly (KB Q822)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: GOTSUMON, dp: 3000, as: "gotsumon" }], security: 3 },
        1: { security: [{ card: DUMMY }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1]!;
    s.state.memory = 5;

    const res = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("gotsumon").permanentId,
      target: { kind: "player" },
    });
    expect(res).toEqual({ ok: true });

    await settle(() => p1.security.length === 0, 400);

    expect(s.state.memory).not.toBe(3);
    expect(s.state.memory).toBe(5);
  });
});
