import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-070.js";

describe("EX2-070 Digivolution Plug-In S", () => {
  it("draws 1 before its optional free digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-025", "EX2-061"],
          hand: [{ card: "EX2-070", as: "option" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("offers only an applicable printed digivolution cost of 3 or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-025", as: "terriermon" }],
          hand: [
            { card: "EX2-070", as: "option" },
            { card: "BT18-049", as: "costFour" },
            { card: "BT6-050", as: "costThree" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.instanceId === s.inst("costThree").instanceId);

    expect(s.perm("terriermon").topCard.cardId).toBe("BT6-050");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("costFour").instanceId)).toBe(true);
  });

  it("accepts an applicable special cost of 3 when the ordinary printed cost is 4", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-025", as: "terriermon" }],
          hand: [
            { card: "EX2-070", as: "option" },
            { card: "BT8-039", as: "specialCostThree" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("terriermon").topCard.instanceId === s.inst("specialCostThree").instanceId);

    expect(s.perm("terriermon").topCard.cardId).toBe("BT8-039");
  });

  it("does not waive the green color requirement without a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-014"], hand: [{ card: "EX2-070", as: "option" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("waives the green color requirement with a Tamer even when no green card is in play", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-014", "EX2-060"], hand: [{ card: "EX2-070", as: "option" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("reveals a Digimon from security, returns the other revealed cards in order, and adds itself to hand", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX2-070", as: "securityOption", faceUp: true }],
          deck: [{ card: "EX2-019", as: "revealedDigimon" }, "EX2-060", "EX2-065"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() =>
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("revealedDigimon").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("securityOption").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-060", "EX2-065"]);
  });
});
