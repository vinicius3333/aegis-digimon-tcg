import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-060.js";
import "../index.js";

describe("EX11-060 Arisa Kinosaki", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-060")).toMatchObject({
      nameEn: "Arisa Kinosaki",
      colors: ["Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws and plays a level 4 Puppet only when the deletion paid Overclock (Q5914)", async () => {
    const deck = ["AD1-001", "AD1-001", "AD1-001"];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-021", as: "puppetToPlay" }],
          deck,
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "EX11-024", as: "overclocker", dp: 6000 },
            { card: "TOKEN-Familiar-Token", as: "overclockCost", dp: 3000 },
          ],
        },
        1: { hand: ["AD1-001"], deck, security: ["AD1-001", "AD1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.isFirstPlayersFirstTurn = true;

    const turn = s.engine.runOneTurn();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "TOKEN-Familiar-Token"),
    ).toBe(false);
    expect(s.perm("arisa").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-021")).toBe(true);
    assertNoLoudGap(s);
  });

  it("sets memory to 3 through the public start-of-turn loop", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-060", as: "arisa" }], deck: ["AD1-001", "AD1-002", "AD1-003"] },
      1: { deck: ["AD1-001", "AD1-002", "AD1-003"] },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("draws after a public ordinary Puppet deletion but does not play from a non-Overclock cause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "EX11-021", as: "victim", dp: 1000, suspended: true },
          ],
          hand: [{ card: "EX11-021", as: "levelFourPuppet" }],
          deck: ["AD1-001", "AD1-002"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], deck: ["AD1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX11-021"));
    expect(s.perm("arisa").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "AD1-001")).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-021")).toBe(false);
    assertNoLoudGap(s);
  });

  it("declines the suspend cost and plays nothing after ordinary Puppet deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "EX11-021", as: "victim", dp: 1000, suspended: true },
          ],
          hand: [{ card: "EX11-021", as: "levelFourPuppet" }],
          deck: ["AD1-001"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], deck: ["AD1-002"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX11-021"));
    expect(s.perm("arisa").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["EX11-021"]);
    assertNoLoudGap(s);
  });

  it("ignores a plain Digimon deletion and rejects a level-5 Puppet replacement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-060", as: "arisa" },
            { card: "BT1-080", as: "plainVictim", dp: 1000, suspended: true },
          ],
          hand: [{ card: "BT1-038", as: "levelFivePuppet" }],
          deck: ["AD1-001"],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], deck: ["AD1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("plainVictim").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-080"));
    expect(s.perm("arisa").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-038"]);
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-060", as: "arisa", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-060"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-060")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR for every printed clause", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "onDeletionOf",
        actions: [
          { kind: "Draw", amount: 1, cost: { kind: "suspend" }, optional: true, abortOnDecline: true },
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            condition: {
              kind: "triggerRemovalCause",
              removalCause: "byEffect",
              removalMechanic: "Overclock",
            },
          },
        ],
      },
    ]);
  });
});
