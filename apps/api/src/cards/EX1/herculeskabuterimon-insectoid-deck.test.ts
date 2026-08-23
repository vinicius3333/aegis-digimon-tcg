import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-035.js";
import "./EX1-040.js";
import "./EX1-043.js";

describe("EX1 HerculesKabuterimon Insectoid deck gauntlet", () => {
  it("chooses an attack evolution, gains memory twice, and restands only once", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-040", as: "megaKabuterimon", under: ["EX1-035"] }],
          hand: [
            { card: "EX1-043", as: "classicHercules" },
            { card: "BT1-081", as: "alternateHercules" },
          ],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "firstTarget", dp: 8000, suspended: true },
            { card: "BT3-019", as: "secondTarget", dp: 9000, suspended: true },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const classicHerculesId = s.inst("classicHercules").instanceId;
    const alternateHerculesId = s.inst("alternateHercules").instanceId;
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    preferred.push(classicHerculesId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("megaKabuterimon").permanentId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("megaKabuterimon").topCard.instanceId === classicHerculesId &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstTargetId) &&
        !s.perm("megaKabuterimon").isSuspended &&
        !observe(s.engine).isAttacking(),
      5000,
    );
    await settle();

    const evolutionChoice = s.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" &&
        req.sourceCardId === "EX1-040" &&
        req.options?.candidateInstanceIds?.includes(classicHerculesId),
    )?.req;
    expect(new Set(evolutionChoice?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([classicHerculesId, alternateHerculesId]),
    );
    expect(s.perm("megaKabuterimon").stack.map(({ cardId }) => cardId)).toEqual(["EX1-035", "EX1-040"]);
    expect(s.perm("megaKabuterimon").currentDP).toBe(14000);
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("megaKabuterimon").permanentId,
        target: { kind: "permanent", permanentId: secondTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondTargetId) &&
        s.perm("megaKabuterimon").isSuspended &&
        !observe(s.engine).isAttacking(),
      5000,
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("megaKabuterimon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
