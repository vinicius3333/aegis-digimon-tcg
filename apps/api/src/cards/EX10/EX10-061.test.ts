import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "./EX10-061.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX10-061 Apocalymon", () => {
  it("Q5783/Q5784: places one face-up card of each distinct Dark Masters name and reduces cost by 4 each", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-061", as: "apocalymon" }],
          security: [
            { card: "EX10-012", as: "metal", faceUp: true },
            { card: "BT15-031", as: "duplicateMetal", faceUp: true },
            { card: "EX10-020", as: "puppet", faceUp: true },
            { card: "BT1-009", as: "faceDown", faceUp: false },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = -1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apocalymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX10-061"));

    const apocalymon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX10-061")!;
    expect(apocalymon.stack).toHaveLength(2);
    expect(new Set(apocalymon.stack.map(({ cardId }) => cardId))).toEqual(new Set(["EX10-012", "EX10-020"]));
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(
      s.inst("duplicateMetal").instanceId,
    );
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toContain(s.inst("faceDown").instanceId);
  });

  it("Q5785/Q5786: plays one of each distinct Dark Masters name from its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX10-061",
              as: "apocalymon",
              under: ["EX10-012", "BT15-031", "EX10-020", "EX10-035"],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("apocalymon"));
    await settle(() => s.state.players[0]!.battleArea.length === 4);

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(
      expect.arrayContaining(["EX10-061", "EX10-012", "EX10-020", "EX10-035"]),
    );
    expect(s.perm("apocalymon").stack).toHaveLength(1);
    expect(["EX10-012", "BT15-031"]).toContain(s.perm("apocalymon").stack[0]!.cardId);
  });
});
