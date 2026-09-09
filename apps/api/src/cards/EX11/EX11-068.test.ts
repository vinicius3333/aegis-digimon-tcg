import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-068.js";
import "../BT20/BT20-072.js";
import "./EX11-051.js";

describe("EX11-068 Violet Inboots", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-068")).toMatchObject({
      nameEn: "Violet Inboots",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-068", as: "violet" }], deck: ["BT1-009", "BT1-013", "BT1-019"] },
      1: { deck: ["BT1-009", "BT1-013", "BT1-019"] },
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

  it("suspends itself, draws, and trashes on a public Execute attack (Q5938)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-068", as: "violet" },
            { card: "BT20-072", as: "executor" },
          ],
          hand: [
            { card: "BT1-090", as: "discard" },
            { card: "EX11-051", as: "evolution" },
          ],
          deck: ["AD1-001"],
        },
        1: { security: ["BT1-009", "BT1-009"], deck: ["BT1-013", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX11-051")).toBe(false);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-090")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX11-051")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("draws and trashes but does not digivolve when the attack is not by ＜Execute＞ (Q5938)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-068", as: "violet" },
            { card: "BT20-063", as: "ghost" },
          ],
          hand: [
            { card: "BT1-090", as: "discard" },
            { card: "EX11-051", as: "evolution" },
          ],
          deck: ["AD1-001"],
        },
        1: { security: ["BT1-091", "BT1-091"], deck: ["BT1-009", "BT1-013", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("violet").isSuspended);

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(s.perm("ghost").topCard?.cardId).toBe("BT20-063");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX11-051")).toBe(true);
    assertNoLoudGap(s);
  });

  it("ignores an attack by a Digimon without the [Ghost] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-068", as: "violet" },
            { card: "EX11-049", as: "nonGhost" },
          ],
          hand: ["BT1-090"],
          deck: ["AD1-001"],
        },
        1: { security: ["BT1-091", "BT1-091"], deck: ["BT1-009", "BT1-013", "BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nonGhost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    expect(s.perm("violet").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("may decline the suspend payment and receives none of the attack rewards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-068", as: "violet" },
            { card: "BT20-072", as: "executor" },
          ],
          hand: ["BT1-090"],
          deck: ["AD1-001"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("executor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("violet").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-068", as: "violet", faceUp: false }] },
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
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-068"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-068")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR scoped to the triggering attacker", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        sourceFilter: { nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }] },
        actions: [
          { kind: "Draw", cost: { kind: "suspend" }, optional: true, abortOnDecline: true },
          { kind: "Trash", target: { filter: { zone: "hand" } } },
          {
            kind: "Digivolve",
            target: { sourceRef: "triggerSubject" },
            from: ["hand"],
            payCost: true,
            reduceCost: 2,
            optional: true,
            condition: { kind: "triggerAttackBy", keyword: "Execute" },
          },
        ],
      },
    ]);
  });
});
