import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-022.js";

describe("EX1-022 Imperialdramon: Dragon Mode", () => {
  it("unsuspends itself and suspends an opponent when digivolving over a Free card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-019", as: "base", suspended: true, under: ["BT1-004", "BT1-029", "BT1-034"] }],
          hand: [{ card: "EX1-022", as: "evo" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended && s.perm("opponent").isSuspended);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("gets only +1000 DP with four blue digivolution cards (Q3209)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX1-022",
            as: "imperialdramon",
            dp: 12000,
            under: ["BT1-004", "BT1-029", "BT1-034", "EX1-019"],
          },
        ],
      },
    });
    await s.ready();
    expect(s.perm("imperialdramon").currentDP).toBe(13000);
  });

  it("does not unsuspend or suspend an opponent without a Free source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-041", as: "base", suspended: true, under: ["BT1-004", "BT1-029", "BT1-034"] }],
          hand: [{ card: "EX1-022", as: "evo" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-022");
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });

  it("counts duplicate same-color sources only once", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-022", as: "imperialdramon", dp: 12000, under: ["BT1-034", "EX1-019"] }],
      },
    });
    await s.ready();
    expect(s.perm("imperialdramon").currentDP).toBe(13000);
  });
});
