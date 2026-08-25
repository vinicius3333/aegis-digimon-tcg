import { describe, expect, it } from "vitest";
import { EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-070.js";

describe("EX11-070 Unchained", () => {
  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-070", as: "unchained" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("unchained"));
    expect(s.state.memory).toBe(3);
  });

  it("Mind Links without requiring the preceding DNA digivolution (Q5940, Q5942)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-029", as: "maquinamonText" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("unchained"));

    expect(s.perm("maquinamonText").stack.map(({ cardId }) => cardId)).toContain("EX11-070");
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "EX11-070")).toHaveLength(0);
  });

  it("DNA digivolves exactly 2 Digimon into ExMaquinamon from hand before Mind Link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-034", as: "firstMaterial" },
            { card: "EX11-029", as: "secondMaterial" },
          ],
          hand: [{ card: "EX11-073", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("unchained"));

    expect(s.perm("result").topCard.cardId).toBe("EX11-073");
    expect(s.perm("result").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX11-034", "EX11-029"]),
    );
    expect(s.state.memory).toBe(2);
  });

  it("clamps the inherited host after summed DP changes and blocks only opposing stack trash (Q5941-Q5943)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-029", as: "host", under: [{ card: "EX11-070", as: "unchained" }] }],
      },
    });
    await s.ready();

    await advance(s.engine).verb.modifyDP(s.perm("host").permanentId, 2000, EffectDuration.UntilEachTurnEnd);
    await advance(s.engine).verb.modifyDP(s.perm("host").permanentId, -7000, EffectDuration.UntilEachTurnEnd);
    expect(s.perm("host").currentDP).toBe(1000);

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("unchained").instanceId],
      1,
    );
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("EX11-070");

    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("unchained").instanceId],
      0,
    );
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX11-070");
  });

  it("plays inherited Unchained from its own stack at end of all turns (Q6523)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-029", as: "host", under: [{ card: "EX11-070", as: "unchained" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-070")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
  });

  it("publishes full exclusive IR for every printed clause", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")?.actions).toMatchObject([
      { kind: "DnaDigivolve", materials: { count: 2 }, payCost: true, optional: true },
      { kind: "MindLink", target: { filter: { textContains: "Maquinamon" } }, optional: true },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      { kind: "MinDpFloor", floor: 1000 },
      { kind: "StackTrashLock" },
    ]);
  });
});
