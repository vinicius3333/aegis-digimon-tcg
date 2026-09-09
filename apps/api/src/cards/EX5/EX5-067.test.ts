import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX5-067.js";
import "../index.js";

describe("EX5-067 Good Night Moon", () => {
  it("suspends one opposing Digimon or Tamer and optionally plays a Night Claw/Light Fang Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      {
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      },
      {
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "opponent", kind: ["Tamer"] } },
      },
      {
        kind: "PlayWithoutCost",
        from: ["hand"],
        payCost: false,
        optional: true,
        target: {
          count: 1,
          filter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [{ match: "trait", tokens: ["Night Claw", "Light Fang"] }],
          },
        },
      },
    ]);
  });
  it("activates its Main effect from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]?.kind).toBe("ActivateMain"));

  it("restricts one opposing Digimon and Tamer and plays a matching Tamer through public Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-017", as: "colorSource" }],
          hand: [
            { card: "EX5-067", as: "option" },
            { card: "EX5-065", as: "playedTamer" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentDigimon" },
            { card: "BT14-088", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-065"));
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "suspend")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-065")).toBe(true);
  });

  it("accepts a Light Fang Tamer as well as the Night Claw peer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-017", as: "colorSource" }],
          hand: [
            { card: "EX5-067", as: "option" },
            { card: "EX5-064", as: "lightFang" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("lightFang").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-064")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still resolves and plays the optional Tamer when the opponent has no targets, per Q3672/Q3673", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-017", as: "colorSource" }],
          hand: [
            { card: "EX5-067", as: "option" },
            { card: "EX5-065", as: "playedTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-065"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-065")).toBe(true);
  });

  it("keeps the optional Tamer in hand when its final clause is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-017", as: "colorSource" }],
          hand: [
            { card: "EX5-067", as: "option" },
            { card: "EX5-065", as: "candidate" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX5-065")).toBe(true);
  });

  it("activates the Main effect through a public security check", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-017", as: "colorSource" }],
          security: [{ card: "EX5-067", as: "option" }],
          hand: [{ card: "EX5-065", as: "candidate" }],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "opponentDigimon" },
            { card: "BT14-088", as: "opponentTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentDigimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentDigimon"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTamer"), "suspend")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX5-065")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
