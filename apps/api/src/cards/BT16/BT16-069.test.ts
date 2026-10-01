import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-069.js";
import "../index.js";
import { X_ANTIBODY_NAME_PROBES, xAntibodyNameGateVerdicts } from "../../engine/testkit/xAntibodyNameGate.js";

describe("BT16-069", () => {
  it("trashes three digivolution cards when Gesomon or X Antibody is underneath", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 3,
        choose: true,
        condition: { kind: "selfDigivolutionStackHasTrait" },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { digivolutionCards: "none" } },
      });
    }
  });

  it("draws and trashes one card as inherited once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", target: { count: 1 } },
      ],
    });
  });

  it("restricts an opponent Digimon without cards underneath even without the first condition", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-069", as: "geso" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geso").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });

  it("naturally trashes three sources and applies the no-source restriction on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-022", as: "source" }],
          hand: [{ card: "BT16-069", as: "geso" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", under: ["BT1-009", "BT1-010", "BT1-011"] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("geso").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("source").topCard?.cardId === "BT16-069" &&
        s.perm("target").stack.length === 0 &&
        observe(s.engine).isRestricted(s.perm("target"), "suspend"),
    );

    expect(s.perm("source").topCard?.cardId).toBe("BT16-069");
    expect(s.perm("target").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);
  });

  it("draws and trashes a card through the inherited effect on a natural attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-044", as: "launcher", under: ["BT1-040", "BT1-036", "BT16-069"] }],
          deck: ["BT1-009"],
          hand: [{ card: "BT1-010", as: "discard" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("launcher").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[0]!.trash.length === 1);

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});

describe("BT16-069 Gesomon (X Antibody) — KB Q&A rulings", () => {
  it("still locks a sourceless opponent Digimon when neither [Gesomon] nor [X Antibody] is under it (Q4708)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-067", as: "demiDevimon" }],
          hand: [{ card: "BT16-069", as: "geso" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "sourced", under: ["BT1-009", "BT1-010", "BT1-011"] },
            { card: "BT1-009", as: "bare" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sourced").topCard!.instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("demiDevimon").permanentId,
        instanceId: s.inst("geso").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("bare"), "suspend"));

    expect(s.perm("demiDevimon").topCard?.cardId).toBe("BT16-069");
    expect(s.perm("sourced").stack).toHaveLength(3);
    expect(observe(s.engine).isRestricted(s.perm("bare"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("sourced"), "suspend")).toBe(false);
  });

  it("treats a Digimon with one or more stacked cards as having cards under it (Q4709)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-022", as: "gesomon" }],
          hand: [{ card: "BT16-069", as: "geso" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "oneLeft", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-013"] },
            { card: "BT1-009", as: "bare" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("oneLeft").topCard!.instanceId);
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("gesomon").permanentId,
        instanceId: s.inst("geso").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("bare"), "suspend"));

    expect(s.perm("oneLeft").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("oneLeft"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("bare"), "suspend")).toBe(true);
  });
});

describe("BT16-069 [X Antibody] reference", () => {
  it("matches the X Antibody card name and its Rule aliases, not X Antibody-trait Digimon", () => {
    expect(xAntibodyNameGateVerdicts("BT16-069")).toEqual(X_ANTIBODY_NAME_PROBES);
  });
});
