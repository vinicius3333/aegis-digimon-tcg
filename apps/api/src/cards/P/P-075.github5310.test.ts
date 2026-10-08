import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-075.js";
import "../BT9/BT9-055.js";
import "../BT1/BT1-082.js";
import "../BT1/BT1-083.js";
import { observe } from "../../engine/testkit/observe.js";

async function evolveOkuwamonIntoGrandis() {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "P-075", as: "host" }],
        hand: [{ card: "BT9-055", as: "grandis" }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    },
    { autoSelectCards: true },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("grandis").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () =>
      s.events.some(
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "BT9-055" && event.timing === "WhenDigivolving",
      ) && s.state.pendingDecision === undefined,
  );
  await settle();
  return s;
}

describe("GitHub #5310 GrandisKuwagamon and Okuwamon", () => {
  it("keeps the committed P-075 snapshot identical to its registered compiled IR", () => {
    const snapshot = JSON.parse(
      readFileSync(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>;
    expect(snapshot["P-075"]).toEqual(runtimeCompiledCard("P-075"));
  });
  it("original reported loop: one public digivolve suspends once and keeps DP stable with a bounded effect lifecycle", async () => {
    const s = await evolveOkuwamonIntoGrandis();
    expect(s.perm("host").topCard.cardId).toBe("BT9-055");
    expect(s.perm("host").currentDP).toBe(16000);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "BT9-055" && event.timing === "WhenDigivolving",
      ),
    ).toHaveLength(1);
    expect(
      s.events.filter(
        (event) => event.kind === "cardsMoved" && event.from === "unsuspended" && event.to === "suspended",
      ),
    ).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "effectTriggered").length).toBeLessThanOrEqual(3);
  });

  it("separate P-075 timing finding: grants the effect before Grandis suspends and gains exactly one memory", async () => {
    const s = await evolveOkuwamonIntoGrandis();
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toHaveLength(1);
    expect(s.state.memory).toBe(7);
    const suspensionIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.from === "unsuspended" && event.to === "suspended",
    );
    const gainIndex = s.events.findIndex((event) => event.kind === "memoryChanged" && event.reason === "gainMemory");
    expect(suspensionIndex).toBeGreaterThanOrEqual(0);
    expect(gainIndex).toBeGreaterThan(suspensionIndex);
  });

  it("does not trigger memory loss when Grandis selects an already suspended recipient", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-075", as: "host" }],
          hand: [{ card: "BT9-055", as: "grandis" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("grandis").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-055") &&
        !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(6);
    expect(observe(s.engine).subscriptions("whenSuspended", s.perm("opponent").permanentId)).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toHaveLength(0);
  });

  it("grants one independent watcher per opponent Digimon without reacting to Grandis's own attack suspension", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-075", as: "host", under: ["BT9-109"] }],
          hand: [{ card: "BT9-055", as: "grandis" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-009", as: "second" },
          ],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    preferred.push(s.perm("first").topCard.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("grandis").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-055") &&
        !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(false);
    for (const target of ["first", "second"])
      expect(observe(s.engine).subscriptions("whenSuspended", s.perm(target).permanentId)).toHaveLength(1);
    preferred.splice(0, preferred.length, s.perm("second").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision);
    expect(s.state.memory).toBe(8);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.events.flatMap((event) => (event.kind === "memoryChanged" && event.reason === "gainMemory" ? [event.to] : [])),
    ).toEqual([7, 8]);
  });

  it("does not grant onto an unrelated evolution or an evolution into a non-Insectoid card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-075", as: "host" },
            { card: "BT1-083", as: "other" },
          ],
          hand: [
            { card: "BT1-082", as: "rosemon" },
            { card: "BT9-055", as: "grandis" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    // The unrelated Insectoid evolution must not activate Okuwamon's self-only clause.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("other").permanentId,
        instanceId: s.inst("grandis").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-055") &&
        !s.state.pendingDecision,
    );
    expect(observe(s.engine).subscriptions("whenSuspended", s.perm("opponent").permanentId)).toHaveLength(0);
    expect(s.state.memory).toBe(9);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("rosemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-082" && !s.state.pendingDecision);
    await s.ready();
    expect(s.state.memory).toBe(6);
    expect(observe(s.engine).subscriptions("whenSuspended", s.perm("opponent").permanentId)).toHaveLength(0);
    expect(observe(s.engine).hasPierce(s.perm("host"))).toBe(false);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toHaveLength(0);
  });
});
