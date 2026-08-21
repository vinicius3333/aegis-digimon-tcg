import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-001 Nyaromon", () => {
  it("attacks only with the DNA result", () => {
    const effect = registeredCompiledCards.get("EX12-001")!.effects[0]!;
    expect(effect.actions[0]).toMatchObject({ kind: "DnaDigivolve", bindResultAs: "dnaResult", materials: { count: 2, filter: { includesSelf: true } } });
    expect(effect.actions[1]).toMatchObject({ kind: "Attack", target: { filter: { boundRef: "dnaResult" } } });
  });

  it("DNA-digivolves the inherited VB Digimon with another VB Digimon and attacks that result", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-042", as: "source", under: ["EX12-001"] },
            { card: "EX12-010", as: "partner" },
          ],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
        1: { battleArea: [{ card: "EX12-005", as: "target", suspended: true, dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const player = s.state.players[0]!;
    const sourceId = s.perm("source").permanentId;
    const partnerId = s.perm("partner").permanentId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX12-044"));
    await settle(() => s.state.pendingDecision === undefined);

    const merged = player.battleArea.find((permanent) => permanent.topCard?.cardId === "EX12-044");
    expect(merged).toBeDefined();
    expect(player.battleArea.some((permanent) => permanent.permanentId === sourceId)).toBe(false);
    expect(player.battleArea.some((permanent) => permanent.permanentId === partnerId)).toBe(false);
    expect(merged!.stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX12-042", "EX12-001", "EX12-010"]),
    );
    expect(merged!.isSuspended).toBe(true);
    expect(player.hand.some((card) => card.cardId === "EX12-044")).toBe(false);
  });

  it("does not offer the optional DNA digivolution without a second qualifying Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-042", as: "source", under: ["EX12-001"] }],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.battleArea[0]!.topCard?.cardId).toBe("EX12-042");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-044")).toBe(true);
  });

  it("does not attack when the controller declines the optional DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-042", as: "source", under: ["EX12-001"] },
            { card: "EX12-010", as: "partner" },
          ],
          hand: [{ card: "EX12-044", as: "result", faceUp: false }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnEndTurn, s.perm("source"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "EX12-042",
      "EX12-010",
    ]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX12-044")).toBe(true);
  });
});
