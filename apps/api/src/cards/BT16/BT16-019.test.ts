import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-019.js";
import "../index.js";

describe("BT16-019", () => {
  it("has Blocker and unsuspends one of your level 4 or lower Digimon on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "Unsuspend", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Unsuspend" }] });
  });
  it("trashes one opposing digivolution card when attacking as inherited", () =>
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }],
    }));

  it("unsuspends one of your suspended level 4 or lower Digimon on a natural play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-018", as: "eligible", suspended: true },
            { card: "BT16-010", as: "tooHigh", suspended: true },
          ],
          hand: [{ card: "BT16-019", as: "source" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("eligible").isSuspended);

    expect(s.perm("eligible").isSuspended).toBe(false);
    expect(s.perm("tooHigh").isSuspended).toBe(true);
  });

  it("unsuspends a selected Digimon on a natural digivolution", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-016", as: "base" },
            { card: "BT16-018", as: "eligible", suspended: true },
          ],
          hand: [{ card: "BT16-019", as: "source" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("eligible").permanentId);
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-019" && !s.perm("eligible").isSuspended);

    expect(s.perm("eligible").isSuspended).toBe(false);
  });

  it("trashes the top opposing digivolution card on a natural inherited attack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-020", as: "host", under: ["BT16-019"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, under: ["BT1-009", "BT1-011"] }] },
      },
      { autoSelectCards: true },
    );
    const topSourceId = s.perm("target").stack.at(-1)!.instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.some((card) => card.instanceId === topSourceId)).toBe(false);
  });
});
