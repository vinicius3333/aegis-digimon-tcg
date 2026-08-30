import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-055.js";

describe("BT15-055", () => {
  it("matches the catalog identity and black level-3 evolution route", () => {
    expect(getCardDefinition("BT15-055")).toMatchObject({
      nameEn: "Hagurumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      types: ["Machine"],
    });
  });

  it("reveals three to add a Machine/Cyborg and a black Tamer", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ count: 1 }, { count: 1 }] }],
    }));
  it("retains inherited Reboot", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Reboot" }],
    }));

  it("naturally reveals three cards and adds one Machine and one black Tamer while bottoming the miss", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-055", as: "hagurumon" }],
          deck: [
            { card: "BT15-066", as: "machine" },
            { card: "BT14-086", as: "blackTamer" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT15-066", "BT14-086"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.memory).toBe(7);
  });

  it("naturally adds the only applicable category card and bottoms the other reveals", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-055", as: "hagurumon" }],
          deck: ["BT15-066", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT15-066"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("naturally applies inherited Reboot during the opponent's active phase", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-058", as: "host", under: ["BT15-055"], suspended: true }], deck: ["BT1-009"] },
      1: { deck: ["BT1-009"] },
    });

    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").isSuspended).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });
});
