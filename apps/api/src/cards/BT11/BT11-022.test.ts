import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-022.js";
import "../index.js"; // the full catalog is always registered in a real match

describe("BT11-022 Dracomon", () => {
  it("matches the catalog and carries both complete watcher contracts", () => {
    expect(getCardDefinition("BT11-022")).toMatchObject({
      cardId: "BT11-022",
      nameEn: "Dracomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Dragon", "BlueFlare"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Bebydomon"], cost: 0, isAlternate: true }]);
    expect(compiled).toMatchObject({
      effects: [
        { trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }] },
        {
          trigger: "YourTurn",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [{ kind: "SubTrigger", event: "whenPlayed" }],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("supports both normal blue and named red Bebydomon evolution for 0", async () => {
    for (const base of ["BT11-002", "BT1-002"] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT11-022", as: "dracomon" }] },
      });
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("dracomon").instanceId,
          ...(base === "BT1-002" ? { useAlternateCost: true } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT11-022");
      expect(s.state.memory).toBe(2);
    }
  });
  it("draws once when another Blue Flare Digimon is played", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-022", as: "dracomon" }],
        // A [Blue Flare] Digimon whose own printed effects never touch the deck, so the
        // expected draw stays on top with the whole catalog registered.
        hand: [{ card: "BT19-022", as: "qualifier" }],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("qualifier").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not trigger for a non-Dramon, non-Blue-Flare Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-022", as: "dracomon" }],
        hand: [{ card: "BT1-010", as: "nonQualifier" }],
        deck: [{ card: "BT1-009", as: "notDrawn" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonQualifier").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("nonQualifier").instanceId),
    );
    await Promise.resolve();

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("notDrawn").instanceId);
  });

  it("inherited effect gains 1 memory for the same qualifying play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-025", as: "carrier", under: ["BT11-022"] }],
        hand: [{ card: "BT19-022", as: "qualifier" }],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("qualifier").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 6);

    // MailBirdramon costs 5 to play, then Dracomon's inherited effect gains 1.
    expect(s.state.memory).toBe(6);
  });

  it("draws for the Dramon-name branch only once across two qualifying plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT11-022", as: "dracomon" }],
        hand: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-009", as: "second" },
        ],
        deck: [
          { card: "BT1-001", as: "drawn" },
          { card: "BT1-002", as: "notDrawn" },
        ],
      },
    });
    s.state.memory = 30;
    for (const alias of ["first", "second"] as const) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst(alias).instanceId),
      );
    }
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("notDrawn").instanceId);
  });
});
