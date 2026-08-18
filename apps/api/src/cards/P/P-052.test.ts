import { describe, expect, it } from "vitest";
import { Zone } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-052.js";

type EngineInternals = {
  primitives: {
    placeUnder(permanentId: string, instanceIds: string[]): Promise<unknown>;
  };
};

describe("P-052 Vikemon", () => {
  it("restricts up to 3 opponent Digimon with no digivolution cards and excludes stacked Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-052", as: "source" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "empty-a" },
            { card: "BT1-009", as: "empty-b" },
            { card: "BT1-009", as: "empty-c" },
            { card: "BT1-009", as: "stacked", under: ["BT1-001"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      ["empty-a", "empty-b", "empty-c"].every((alias) =>
        observe(s.engine).isRestricted(s.perm(alias), "attack"),
      ),
    );

    for (const alias of ["empty-a", "empty-b", "empty-c"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "attack")).toBe(true);
    }
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "attack")).toBe(false);
  });

  it("allows the UI decision to choose only 1 of 3 eligible Digimon for the up-to-3 restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-052", as: "source" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "chosen" },
            { card: "BT1-010", as: "eligible-b" },
            { card: "BT1-011", as: "eligible-c" },
            { card: "BT1-012", as: "stacked", under: ["BT1-001"] },
          ],
        },
      },
      { autoSelectCards: false },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "chooseTargets"));
    const decision = s.decisions.find(({ req }) => req.kind === "chooseTargets")!.req;
    expect(decision.options?.candidateInstanceIds).toHaveLength(3);

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "chooseTargets", instanceIds: [s.perm("chosen").permanentId] },
    })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("chosen"), "attack"));

    expect(observe(s.engine).isRestricted(s.perm("chosen"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("eligible-b"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("eligible-c"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("stacked"), "attack")).toBe(false);
  });

  it("restriction remains after the affected Digimon gains a digivolution card (Q4169)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-011", as: "base" },
            { card: "BT1-089", as: "tamer" },
          ],
          hand: [{ card: "P-052", as: "source" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));

    const addedSource = s.give(1, Zone.Hand, "BT1-001");
    await (s.engine as unknown as EngineInternals).primitives.placeUnder(
      s.perm("target").permanentId,
      [addedSource.instanceId],
    );

    expect(s.perm("target").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
  });

  it("returns only an opponent Digimon with no digivolution cards when attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-052", as: "attacker" }] },
        1: {
          security: ["BT1-028"],
          battleArea: [
            { card: "BT1-009", as: "empty" },
            { card: "BT1-009", as: "stacked", under: ["BT1-001"] },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("empty").topCard!.instanceId);
    await s.ready();
    const emptyCardId = s.perm("empty").topCard!.instanceId;
    const stackedPermanentId = s.perm("stacked").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === emptyCardId));

    expect(s.state.players[1]!.hand.some((card) => card.instanceId === emptyCardId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === stackedPermanentId)).toBe(true);
  });

  it("returns an opponent Digimon only once per turn across two attacks", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-052", as: "attacker" }] },
        1: {
          security: ["BT1-028", "BT1-028"],
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").topCard!.instanceId);
    const firstTopId = s.perm("first").topCard!.instanceId;
    const secondPermanentId = s.perm("second").permanentId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.hand.some((card) => card.instanceId === firstTopId) &&
        s.events.filter((event) => event.kind === "combatResolved").length === 1,
    );

    await (s.engine as unknown as {
      primitives: { unsuspend(permanentIds: string[]): Promise<void> };
    }).primitives.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length === 2);

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondPermanentId)).toBe(true);
  });
});
