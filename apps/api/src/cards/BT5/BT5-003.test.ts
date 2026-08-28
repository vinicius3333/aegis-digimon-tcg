import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-003.js";

describe("BT5-003 Pickmon", () => {
  it("gives an opposing Digimon -1000 DP when its host attacks with 3 Digimon in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-019", as: "host", under: ["BT5-003"] }, "BT1-009", "BT1-010"] },
        1: { battleArea: [{ card: "BT4-076", as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    const target = s.perm("target");
    const before = target.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === before - 1000);
    expect(target.currentDP).toBe(before - 1000);
  });

  it("does not activate with only 2 Digimon in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-019", as: "host", under: ["BT5-003"] }, "BT1-009"] },
      1: { battleArea: [{ card: "BT4-076", as: "target" }], security: ["BT1-011"] },
    });
    const target = s.perm("target");
    const before = target.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(target.currentDP).toBe(before);
  });

  it("activates after a legal Yellow breeding evolution", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT5-003", as: "host" },
          hand: [{ card: "BT1-045", as: "evolving" }],
          battleArea: ["BT1-009", "BT1-010"],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT4-076", as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT1-045");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT5-003"]);

    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").inBreeding);
    s.state.phase = Phase.Main;

    const target = s.perm("target");
    const before = target.currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === before - 1000);
    expect(target.currentDP).toBe(before - 1000);
  });

  it("counts only battle-area Digimon, not a Digimon in the breeding area", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-019", as: "host", under: ["BT5-003"] }, "BT1-009"],
        breeding: "BT1-010",
      },
      1: { battleArea: [{ card: "BT4-076", as: "target" }], security: ["BT1-011"] },
    });
    const target = s.perm("target");
    const before = target.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(target.currentDP).toBe(before);
  });

  it("reduces exactly one opposing Digimon and leaves own Digimon untouched", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-019", as: "host", under: ["BT5-003"] },
            { card: "BT1-009", as: "ownOther" },
            "BT1-010",
          ],
        },
        1: {
          battleArea: [
            { card: "BT4-076", as: "target" },
            { card: "BT4-076", as: "untouched" },
          ],
          security: ["BT1-011"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard!.instanceId);
    const target = s.perm("target");
    const untouched = s.perm("untouched");
    const own = s.perm("host");
    const ownOther = s.perm("ownOther");
    const targetBefore = target.currentDP;
    const untouchedBefore = untouched.currentDP;
    const ownBefore = own.currentDP;
    const ownOtherBefore = ownOther.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: own.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === targetBefore - 1000);
    expect(target.currentDP).toBe(targetBefore - 1000);
    expect(untouched.currentDP).toBe(untouchedBefore);
    expect(own.currentDP).toBe(ownBefore);
    expect(ownOther.currentDP).toBe(ownOtherBefore);
  });

  it("keeps the reduction through attack end and expires at the owner's turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-019", as: "host", under: ["BT5-003"] }, "BT1-009", "BT1-010"],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT4-076", as: "target" }], security: ["BT1-011"] },
      },
      { autoSelectCards: true },
    );
    const target = s.perm("target");
    const before = target.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === before - 1000);
    expect(target.currentDP).toBe(before - 1000);

    await advance(s.engine).runTurn(0);
    expect(target.currentDP).toBe(before);
  });
});
