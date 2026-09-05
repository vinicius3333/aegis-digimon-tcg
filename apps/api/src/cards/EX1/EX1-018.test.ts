import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-018.js";

describe("EX1-018 Zudomon", () => {
  it("trashes the bottom digivolution card when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-014", as: "base" }], hand: [{ card: "EX1-018", as: "evo" }] },
        1: { battleArea: [{ card: "BT1-032", as: "target", under: [{ card: "BT1-029", as: "bottom" }, "BT1-030"] }] },
      },
      { autoSelectCards: true },
    );
    const bottomId = s.inst("bottom").instanceId;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === bottomId));
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("can attack an unsuspended Digimon only when it has no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-018", as: "zudomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zudomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eligible").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("rejects an unsuspended opposing Digimon with a digivolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-018", as: "zudomon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-001"] }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("zudomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("stacked").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });

  it("leaves a stackless opposing target unchanged when no source can be trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-014", as: "base" }], hand: [{ card: "EX1-018", as: "evo" }] },
        1: { battleArea: [{ card: "BT1-032", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-018");
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("removes the unsuspended-target permission outside your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-018", as: "zudomon" }], hand: ["BT1-009"], deck: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }], hand: ["BT1-009"], deck: ["BT1-001"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).canAttackUnsuspended(s.perm("zudomon"))).toBe(true);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).canAttackUnsuspended(s.perm("zudomon"))).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
