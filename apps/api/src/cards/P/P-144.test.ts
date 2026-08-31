import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-144.js";

describe("P-144 Gotsumon (X Antibody)", () => {
  it("keeps the Your Turn attack restriction when only an X Antibody card is underneath", () => {
    const effect = runtimeCompiledCard("P-144")?.effects.find((entry) => entry.trigger === "YourTurn");
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "attack",
          condition: {
            kind: "selfLacksInDigivolutionCards",
            filter: { nameOrTrait: [{ tokens: ["Gotsumon"], match: "name" }] },
          },
        },
      ],
    });
    expect(JSON.stringify(effect)).not.toContain("X Antibody");
  });

  it("encodes Blocker, target-switch unsuspension, and inherited Blocker DP", () => {
    const compiled = runtimeCompiledCard("P-144")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
        expect.objectContaining({
          trigger: "OpponentsTurn",
          frequency: "OncePerTurn",
          actions: [expect.objectContaining({ kind: "SubTrigger", event: "whenAttackTargetSwitched" })],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          isInherited: true,
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000 })],
        }),
      ]),
    );
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gotsumon"], cost: 0, isAlternate: true }]);
  });

  it("applies the inherited +1000 DP to Blocker Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["P-144"] },
          { card: "P-144", as: "blocker" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("blocker").currentDP).toBe(s.perm("blocker").baseDP + 1000);
  });

  it("prevents attacking when no Gotsumon card is in the digivolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-144", as: "source", under: ["BT9-050"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    s.state.phase = Phase.Main;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("source"), "attack")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toMatchObject({ ok: false });
  });

  it("allows attacking when a Gotsumon card is in the digivolution stack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-144", as: "source", under: ["BT13-061"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], security: 1 },
    });
    s.state.phase = Phase.Main;
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("source"), "attack")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toMatchObject({ ok: true });
  });

  it("unsuspends a Blocker when an opponent-turn attack target switches", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-144", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("source").permanentId })).toEqual(
      { ok: true },
    );
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("only resolves the target-switch reaction once per opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-144", as: "first" },
            { card: "P-144", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attackerOne" },
            { card: "BT1-009", as: "attackerTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    for (const [attacker, blocker] of [
      ["attackerOne", "first"],
      ["attackerTwo", "second"],
    ] as const) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(attacker).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
      expect(
        s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm(blocker).permanentId }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.events.filter((event) => event.kind === "combatResolved").length >= (attacker === "attackerOne" ? 1 : 2),
      );
    }
    expect(s.perm("first").isSuspended).toBe(false);
    expect(s.perm("second").isSuspended).toBe(true);
  });
});
