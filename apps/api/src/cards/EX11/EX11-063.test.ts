import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-063.js";
import "../index.js";
import "../BT14/BT14-033.js";

describe("EX11-063 Winr", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-063")).toMatchObject({
      nameEn: "Winr",
      colors: ["Green", "Black"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "SecurityManipulation", op: "toHand", faceDownOnly: true },
      { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true, optional: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions).toMatchObject([
      { kind: "SelectBind", target: { bindAs: "buffedDigimon" }, cost: { kind: "suspend" } },
      { kind: "GainKeyword", target: { fromSelectionRef: "buffedDigimon" } },
      { kind: "GainKeyword", target: { fromSelectionRef: "buffedDigimon" } },
      { kind: "Attack", target: { fromSelectionRef: "buffedDigimon" }, optional: false },
    ]);
  });

  it("publicly places a Royal Base card face up at security bottom from an empty stack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-063", as: "winr" },
            { card: "EX11-025", as: "royalBase" },
          ],
          security: [],
        },
        1: { security: ["BT1-009"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("winr").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-063"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: "EX11-025", faceUp: true });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("takes the top face-down security card before placing Royal Base face up at the bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-063", as: "winr" },
            { card: "EX11-025", as: "royalBase" },
          ],
          security: [
            { card: "BT1-090", faceUp: true },
            { card: "BT1-091", faceUp: false },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("winr").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2 && s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-090", "EX11-025"]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(true);
    expect(s.state.players[0]!.security[1]!.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-091"]);
    assertNoLoudGap(s);
  });

  it("keeps a face-up Royal Base through a public security check", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-063", as: "winr" },
            { card: "EX11-025", as: "royalBase" },
          ],
          security: [],
        },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("winr").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ cardId }) => cardId === "EX11-025"));
    const royalBase = s.state.players[0]!.security.find(({ cardId }) => cardId === "EX11-025")!;
    expect(royalBase.faceUp).toBe(true);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some((event) => event.kind === "securityChecked" && event.revealedCardId === "EX11-025"),
    );
    expect(s.events.some((event) => event.kind === "securityChecked" && event.revealedCardId === "EX11-025")).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("resets face-up security to face down through a public Patamon shuffle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-033", as: "patamon" }],
          hand: [
            { card: "EX11-063", as: "winr" },
            { card: "EX11-025", as: "royalBase" },
          ],
          security: [
            { card: "BT1-090", faceUp: true },
            { card: "BT1-091", faceUp: false },
          ],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-019"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("winr").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some(({ cardId }) => cardId === "EX11-025"));
    expect(s.state.players[0]!.security.some((card) => card.faceUp)).toBe(true);

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.security.every((card) => !card.faceUp));
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toContain("EX11-025");
    expect(s.state.players[0]!.security.every((card) => card.faceUp === false)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the natural start of turn when memory is 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-063", as: "winr" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 2;
    s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(s.state.memory).toBe(3);
  });

  it("suspends Winr, grants Collision and Piercing, and forces the Royal Base to attack at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-063", as: "winr" },
            { card: "BT18-056", as: "royalBase" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.perm("winr").isSuspended);
    expect(s.perm("winr").isSuspended).toBe(true);
    await settle(() => s.events.some(({ kind }) => kind === "attackDeclared"));
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "attackDeclared",
        attackerPermanentId: s.perm("royalBase").permanentId,
      }),
    );
  });

  it("plays Winr from a real security check without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-063", as: "securityWinr" }], hand: ["EX11-025"] },
      1: { battleArea: [{ card: "BT1-037", as: "attacker" }], security: [] },
    });
    s.state.turnSeat = 1;
    s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-063"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-063")).toBe(true);
  });
});
