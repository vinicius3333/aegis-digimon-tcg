import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-092.js";
import "../index.js";

describe("BT26-092 compiled behavior", () => {
  it("maps Shota's printed start, redirect, and Security effects", () => {
    expect(getCardDefinition("BT26-092")).toMatchObject({
      nameEn: "Shota Kuroi",
      colors: ["Black"],
      kinds: ["Tamer"],
      types: ["TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true });
    expect(compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "trash" },
      actions: [{ kind: "Draw" }, { kind: "GainMemory" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
    });
  });

  it("publicly pays the TS discard cost, draws, and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-092", as: "shota" }],
          hand: [{ card: "BT25-093", as: "tsCard" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("tsCard").instanceId);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("retains the optional TS attack redirection target and deck-bottom cost", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OpponentsTurn")?.actions[0];
    expect(action).toMatchObject({
      actions: [{ kind: "RedirectAttack", cost: { kind: "return", to: "deckBottom" }, optional: true }],
    });
  });
});
