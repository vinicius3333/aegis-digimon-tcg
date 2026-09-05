import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-035.js";
import "../index.js";

describe("EX5-035 Hawkmon", () => {
  it("reveals three and adds all revealed Digimon with Fortitude", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { count: "all", to: "hand", filter: { controllerDefault: "mine", kind: ["Digimon"], keywords: ["Fortitude"] } },
      ],
    });
  });
  it("gets 1000 DP while suspended as an inherited effect", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: { kind: "selfIsSuspended" },
        },
      ],
    });
  });

  it("adds every revealed Fortitude Digimon and places the rest at deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-035", as: "hawkmon" }],
          deck: ["EX5-032", "BT1-009", "EX5-032"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hawkmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.filter((card) => card.cardId === "EX5-032").length === 2);

    expect(s.state.players[0]!.hand.filter((card) => card.cardId === "EX5-032")).toHaveLength(2);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("gets 1000 DP while a host is suspended and loses it when unsuspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-035"], suspended: true }] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(6000);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
