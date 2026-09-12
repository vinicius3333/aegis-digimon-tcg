import { describe, expect, it } from "vitest";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-020 Tommy, Takuya, & Zoe", () => {
  it("documents and encodes the four-Hybrid threshold for gaining 2 memory", () => {
    const compiled = registeredCompiledCards.get("AD1-020");
    expect(compiled).toBeDefined();
    for (const trigger of ["StartOfYourMainPhase", "OnPlay"]) {
      const effect = compiled!.effects.find((entry) => entry.trigger === trigger);
      const gain = effect?.actions.find((action) => action.kind === "GainMemory");
      expect(gain).toMatchObject({ amount: 2, condition: { kind: "selfDigivolutionStackCountAtLeast", count: 4 } });
      expect((gain as { condition?: { raw?: string } }).condition?.raw).toContain("4 or more");
    }
  });

  it("places two differently colored Hybrid cards under itself and draws", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "AD1-020", as: "tamer" },
            { card: "AD1-002", as: "redHybrid" },
            { card: "BT12-024", as: "blueHybrid" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    const tamer = () => s.state.players[0]!.battleArea.find((perm) => perm.topCard.cardId === "AD1-020");
    await settle(() => (tamer()?.stack.length ?? 0) === 2);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(tamer()?.stack).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("can assign different colors to two identical multicolor Hybrid cards (Q6099)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "AD1-020", as: "tamer" },
            { card: "BT18-022", as: "hybrid-a" },
            { card: "BT18-022", as: "hybrid-b" },
          ],
          deck: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    const tamer = () => s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "AD1-020");
    await settle(() => tamer()?.stack.length === 2);
    expect(tamer()?.stack).toHaveLength(2);
  });

  it("gains 2 memory at four Hybrid sources even when it places nothing (Q6100)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-020", as: "tamer", under: ["BT12-009", "BT12-012", "BT12-024", "BT12-025"] }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("makes its qualifying Hybrid host attack with Security Attack +1 at end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "host", under: ["AD1-020"] }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: [
            "BT1-009",
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
            "BT1-011",
          ],
          hand: ["BT1-012"],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.security).toHaveLength(8);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.security).toHaveLength(6);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("makes its qualifying Ten Warriors host attack with Security Attack +1 at end of turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT12-032", as: "host", under: ["AD1-020"] }] },
        1: { security: ["BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not grant the inherited attack effect to a non-Hybrid host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-010", as: "host", under: ["AD1-020"] }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(false);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
  });

  it("does not leave Security Attack +1 active when a qualifying host cannot attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "host", under: ["AD1-020"], suspended: true }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: ["BT1-009", "BT1-010"],
          hand: ["BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("allows declining the optional attack without granting the attack-only keyword", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-015", as: "host", under: ["AD1-020"] }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          security: ["BT1-009", "BT1-010"],
          hand: ["BT1-011"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "AD1-020", as: "tamer" }] },
        1: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 20000 }] },
      },
      { autoDeclineOptional: true },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-020"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "AD1-020")).toBe(true);
  });
});
