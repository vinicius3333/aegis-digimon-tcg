import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-10 Henry Wong", () => {
  it("gains 1 memory at the start of your Main Phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-10", as: "henry" }] },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    await settle(() => s.events.some((event) => event.kind === "memoryChanged" && event.from === 5 && event.to === 6));

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", from: 5, to: 6, reason: "gainMemory" }),
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays itself from Security without paying its play cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST17-10", as: "henry" }, "BT1-090"] },
      1: { battleArea: ["BT1-009"] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST17-10"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-10")).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("places Henry, Gargomon, and Rapidmon under one Terriermon before the free MegaGargomon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-02", as: "terriermon" },
            { card: "ST17-10", as: "henry" },
          ],
          trash: [{ card: "ST17-05" }, { card: "ST17-07" }],
          hand: [{ card: "ST17-08", as: "mega" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    const [effect] = JSON.parse(s.perm("henry").activatableEffectsJson) as { effectKey: string }[];
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("henry").topCard.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.cardId === "ST17-08");

    expect(s.perm("terriermon").topCard.cardId).toBe("ST17-08");
    expect(s.perm("terriermon").stack).toHaveLength(4);
    expect(observe(s.engine).hasKeyword(s.perm("terriermon"), "Rush")).toBe(true);
  });
});
