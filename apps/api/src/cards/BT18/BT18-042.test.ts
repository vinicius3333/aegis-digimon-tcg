import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-042.js";

describe("BT18-042 MagnaGarurumon", () => {
  it("places an exact level 5 stack card into security and deletes the matching opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-060", as: "host" }],
          hand: [{ card: "BT18-042", as: "magna" }],
          deck: ["BT1-009"],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-060", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.cardId === "BT1-060"));

    expect(s.perm("host").topCard?.cardId).toBe("BT18-042");
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.some((card) => card.cardId === "BT1-060")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(
      s.state.players[1]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("target").instanceId),
    ).toBe(false);
    assertNoLoudGap(s);
  });

  it("shares its once-per-turn use between When Digivolving and End of Opponent's Turn", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-060", as: "base", under: [{ card: "BT1-009", as: "level3Source" }] },
          ],
          hand: [{ card: "BT18-042", as: "source" }],
          security: ["BT1-001"],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "level5" },
            { card: "BT1-009", as: "level3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredInstanceIds },
    );
    s.state.memory = 10;
    await s.ready();
    preferredInstanceIds.push(s.perm("base").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT18-042");
    await settle(() => s.perm("base").stack.length === 1);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-009"]);
    assertNoLoudGap(s);
  });

  it("triggers on an opponent's attack, pays top security, unsuspends, and only acts once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-042", as: "source", suspended: true }],
          security: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-060", as: "firstAttacker" },
            { card: "BT1-060", as: "secondAttacker" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("first").instanceId));

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("first").instanceId)).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("second").instanceId]);
    assertNoLoudGap(s);
  });

  it("digivolves from Koji with more than 5 Hybrid sources for 5 without firing a Digimon digivolution trigger", async () => {
    const hybrids = Array.from({ length: 6 }, () => "BT7-021");
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-087", as: "koji", under: hybrids }],
        hand: [{ card: "BT18-042", as: "magna" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-060", as: "wouldMatch" }] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koji").permanentId,
        instanceId: s.inst("magna").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koji").topCard?.instanceId === s.inst("magna").instanceId);

    expect(s.state.memory).toBe(5);
    expect(s.perm("koji").stack).toHaveLength(7);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("evolutionDraw").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("wouldMatch").permanentId),
    ).toBe(true);
    assertNoLoudGap(s);
  });
});
