import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST18-15 Anemoi Embrace", () => {
  it("suspends your Digimon, bottoms a suspended opponent Digimon, then unsuspends a Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST18-15", as: "option" }], battleArea: [{ card: "ST18-03", as: "ownTarget" }] },
        1: { battleArea: [{ card: "ST18-03", as: "opponentTarget", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "ST18-03"));
    await settle(() => !s.perm("ownTarget").isSuspended);

    expect(s.perm("ownTarget").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("ST18-03");
  });

  it("returns a suspended opponent Digimon to deck bottom from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST18-15", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "ST18-03", as: "opponentTarget", suspended: true }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[1]!.deck.some((card) => card.cardId === "ST18-03"));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("ST18-03");
  });

  it("still resolves the then-unsuspend when the first effect did not suspend your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST18-15", as: "option" }],
          battleArea: [{ card: "ST18-03", as: "ownTarget", suspended: true }],
        },
        1: { battleArea: [{ card: "ST18-03", as: "opponentTarget" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("ownTarget").isSuspended);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("ownTarget").isSuspended).toBe(false);
    expect(s.perm("opponentTarget").isSuspended).toBe(false);
    expect(s.state.players[1]!.deck.some((card) => card.cardId === "ST18-03")).toBe(false);
  });
});
