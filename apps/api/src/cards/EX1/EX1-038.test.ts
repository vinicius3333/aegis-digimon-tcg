import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-075.js";
import "../BT8/BT8-104.js";
import "../ST1/ST1-07.js";
import "../ST9/ST9-13.js";
import "./EX1-038.js";

describe("EX1-038 Stingmon", () => {
  it("performs a real Piercing security check after deleting an opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-038", as: "stingmon" }] },
      1: {
        battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 4000 }],
        security: ["BT1-001", "BT1-001"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("stingmon"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("stingmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("grants inherited Piercing to a legal Imperialdramon stack and performs the check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-038", "EX1-041"] }] },
      1: {
        battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 4000 }],
        security: ["BT1-001", "BT1-001"],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("keeps checking after losing Piercing while Security Attack +1 remains (Q3225)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-13", as: "freeHost", under: ["ST1-07", "EX1-038", "BT1-075"] }],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 3000 }],
          security: ["BT8-104", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.perm("freeHost").topCard.cardId).toBe("ST9-13");
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("freeHost"), "SecurityAttack")).toBe(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("freeHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
    expect(s.perm("freeHost").topCard.cardId).toBe("BT1-075");
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("freeHost"), "SecurityAttack")).toBe(1);
  });

  it("stops the next Piercing check when De-Digivolve removes Security Attack +1 (Q3225)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST9-13", as: "freeHost", under: ["EX1-038", "BT1-075"] }],
        },
        1: {
          battleArea: [{ card: "BT1-070", as: "target", suspended: true, dp: 3000 }],
          security: ["BT8-104", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("freeHost"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("freeHost").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("freeHost").topCard.cardId).toBe("BT1-075");
    expect(observe(s.engine).hasPierce(s.perm("freeHost"))).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("freeHost"), "SecurityAttack")).toBe(0);
  });

  it("does not grant inherited Piercing outside your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-022", as: "host", under: ["EX1-038", "EX1-041"] }],
        hand: ["BT1-001"],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-001", "BT1-001"],
      },
      1: {
        hand: ["BT1-001"],
        deck: ["BT1-001", "BT1-002"],
        security: ["BT1-001", "BT1-001"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
