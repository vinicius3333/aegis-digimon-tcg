import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-069.js";
import "../index.js";

describe("BT16-069", () => {
  it("trashes three digivolution cards when Gesomon or X Antibody is underneath", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 3,
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
          battleArea: [
            { card: "BT1-044", as: "launcher", under: ["BT1-040", "BT1-036"] },
            { card: "BT16-069", as: "geso" },
          ],
          deck: ["BT1-009"],
          hand: [{ card: "BT1-010", as: "discard" }],
        },
      },
      { autoSelectCards: true },
    );

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
