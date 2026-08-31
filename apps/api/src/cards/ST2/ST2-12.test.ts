import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST2-12.js";

describe("ST2-12 Matt Ishida", () => {
  it("matches the start-of-turn and security-play contract", () => {
    const definition = getCardDefinition("ST2-12")!;
    const compiled = getCompiledCard("ST2-12")!;

    expect(definition.effectText).toContain("gain 1 memory");
    expect(definition.securityEffectText).toContain("Play this card without paying");
    expect(compiled.effects).toEqual([
      {
        trigger: "StartOfYourTurn",
        actions: [
          {
            kind: "GainMemory",
            amount: 1,
            condition: {
              kind: "opponentHas",
              filter: { digivolutionCards: "none", controller: "opponent", zone: "battleArea", kind: ["Digimon"] },
              raw: "your opponent has a Digimon with no digivolution cards",
            },
          },
        ],
      },
      {
        trigger: "Security",
        actions: [
          { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
        ],
        isSecurity: true,
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("gains 1 memory at the start of your turn when the opponent has a source-less Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST2-12", as: "matt" }] }, 1: { battleArea: ["ST2-03"] } });
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("gains once for each copy, not once for each source-less opposing Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST2-12", as: "matt1" },
          { card: "ST2-12", as: "matt2" },
        ],
      },
      1: { battleArea: ["ST2-03", "ST1-03"] },
    });
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("ignores breeding and does not gain memory when the battle-area Digimon has a source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-12", as: "matt" }] },
      1: {
        battleArea: [{ card: "ST2-06", under: ["ST2-03"] }],
        breeding: "ST2-03",
      },
    });
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not gain memory when the opponent has no battle-area Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-12", as: "matt" }] },
      1: { breeding: "ST2-03" },
    });
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays itself from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST2-12", as: "securityMatt" }, "BT1-090"] },
      1: { battleArea: ["BT1-009"] },
    });
    const id = s.inst("securityMatt").instanceId;
    s.state.memory = 0;
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === id));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === id)).toBe(true);
    expect(s.state.memory).toBe(0);
  });
});
