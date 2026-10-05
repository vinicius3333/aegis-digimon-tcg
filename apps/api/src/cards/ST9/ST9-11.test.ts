import { describe, expect, it } from "vitest";
import type { Intent } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST9-11.js";

describe("ST9-11 Dinobeemon", () => {
  it("suspends but does not freeze on an ordinary digivolution", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST9-09", as: "base" }], hand: [{ card: "ST9-11", as: "dinobee" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dinobee").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
  });

  it("suspends and freezes the selected Digimon after DNA digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-04", as: "blue" },
            { card: "ST9-09", as: "green" },
          ],
          hand: [{ card: "ST9-11", as: "dinobee" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
        instanceId: s.inst("dinobee").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
  });

  it("freezes exactly the Digimon selected for suspension and counts only the host's two colors", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-04", as: "blue" },
            { card: "ST9-09", as: "green" },
            { card: "BT1-025", as: "redAlly" },
          ],
          hand: [
            { card: "ST9-11", as: "dinobee" },
            { card: "ST9-06", as: "dragonMode" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "other" },
          ],
        },
      },
      {
        autoOrderTriggers: true,
        autoSelectCards: true,
        autoDeclineOptional: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("chosen").permanentId);

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
        instanceId: s.inst("dinobee").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "unsuspendDuringOwnUnsuspendPhase"));

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("chosen"), "unsuspendDuringOwnUnsuspendPhase")).toBe(true);
    expect(s.perm("other").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("other"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);

    const dnaHost = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "ST9-11")!;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: dnaHost.permanentId,
        instanceId: s.inst("dragonMode").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => dnaHost.topCard.cardId === "ST9-06" && dnaHost.currentDP === 14000);

    expect(dnaHost.currentDP).toBe(14000);
  });
});

describe("ST9-11 Dinobeemon — KB Q&A rulings", () => {
  async function digivolveThenReachOpponentMain(mechanic: "ordinary" | "dna") {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST9-04", as: "blue" },
            { card: "ST9-09", as: "green" },
          ],
          hand: [{ card: "ST9-11", as: "dinobee" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const intent: Intent =
      mechanic === "dna"
        ? {
            type: "dnaDigivolve",
            materialPermanentIds: [s.perm("green").permanentId, s.perm("blue").permanentId],
            instanceId: s.inst("dinobee").instanceId,
          }
        : {
            type: "digivolve",
            permanentId: s.perm("green").permanentId,
            instanceId: s.inst("dinobee").instanceId,
          };
    expect(s.engine.applyIntent(0, intent)).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    const suspendedAfterDigivolving = s.perm("target").isSuspended;

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    return { suspendedAfterDigivolving, suspendedInOpponentMain: s.perm("target").isSuspended };
  }

  it("only suspends on a non-DNA digivolve; the no-unsuspend part needs a DNA digivolve (Q719)", async () => {
    const ordinary = await digivolveThenReachOpponentMain("ordinary");
    expect(ordinary).toEqual({ suspendedAfterDigivolving: true, suspendedInOpponentMain: false });

    const dna = await digivolveThenReachOpponentMain("dna");
    expect(dna).toEqual({ suspendedAfterDigivolving: true, suspendedInOpponentMain: true });
  });

  it("counts only the top card's colors for its inherited DP bonus, not its digivolution cards' colors (Q720)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST9-13", as: "monoTop", under: ["BT1-009", "ST9-04", "ST9-11"] },
          { card: "ST9-06", as: "dualTop", under: ["BT1-009", "ST9-04", "ST9-11"] },
        ],
      },
    });
    await s.ready();

    expect(s.perm("monoTop").currentDP).toBe(11000 + 1000);
    expect(s.perm("dualTop").currentDP).toBe(12000 + 2000);
  });
});
