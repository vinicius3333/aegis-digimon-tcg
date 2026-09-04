import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-017.js";
import "../index.js";

describe("EX4-017 Gaogamon", () => {
  it("returns an opposing level 3 Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
    });
  });
  it("gains memory once per turn when an effect adds to the opponent's hand", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", actions: [{ kind: "GainMemory", amount: 1 }] },
      ],
    });
  });

  it("returns one opposing level 3 Digimon to its owner's hand", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX4-017", as: "gaogamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "level3" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("gaogamon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("gains memory only once when effects add multiple opposing cards to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-030", as: "host", under: ["EX4-017"] },
            { card: "EX4-017", as: "source" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget" },
            { card: "BT1-009", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.None, s.perm("host"));

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 1);
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 2);

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.hand).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
