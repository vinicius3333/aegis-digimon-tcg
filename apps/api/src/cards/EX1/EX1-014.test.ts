import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-014.js";

describe("EX1-014 ExVeemon", () => {
  it("has Jamming as its main keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-014", as: "exveemon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("exveemon"), "Jamming")).toBe(true);
  });

  it("grants inherited Jamming to a Free-trait host on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-019", as: "freeHost", under: ["EX1-014"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("freeHost"), "Jamming")).toBe(true);
  });

  it("grants inherited Jamming through the Imperialdramon name branch", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-022", as: "imperial", under: ["EX1-014", "EX1-019"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("imperial"), "Jamming")).toBe(true);
  });

  it("survives a losing security battle through real Jamming behavior", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-014", as: "exveemon" }] },
      1: { security: ["BT1-020"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("exveemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.events.find((event) => event.kind === "securityChecked")).toMatchObject({
      battle: { attackerDeleted: true },
    });
  });

  it("does not grant inherited Jamming outside your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-019", as: "freeHost", under: ["EX1-014"] }],
        hand: ["BT1-009"],
        deck: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-070" }], hand: ["BT1-009"], deck: ["BT1-001"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("freeHost"), "Jamming")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
