import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-027.js";
import "./EX2-029.js";
import "../ST4/ST4-15.js";

describe("EX2-027 Rapidmon", () => {
  it("suspends an opposing Digimon when digivolving with a green Tamer in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-026", as: "base" }, "EX2-061"], hand: [{ card: "EX2-027", as: "evolution" }] },
        1: { battleArea: [{ card: "EX2-014", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Digimon without a green Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-026", as: "base" }], hand: [{ card: "EX2-027", as: "evolution" }] },
        1: { battleArea: [{ card: "EX2-014", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX2-027");
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("gains inherited Security Attack +1 when an opponent's Digimon becomes suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-029", as: "host", under: ["EX2-027"] }],
          hand: [
            { card: "ST4-15", as: "option1" },
            { card: "ST4-15", as: "option2" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "EX2-014", as: "target1" },
            { card: "EX2-014", as: "target2" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option1").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack") === 1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target2").isSuspended);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(1);
    const turnLoop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).keywordAmount(s.perm("host"), "SecurityAttack")).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turnLoop;
  });
});
