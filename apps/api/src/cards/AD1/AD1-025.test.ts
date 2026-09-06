import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-025 Omnimon", () => {
  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-025");
    const compiled = registeredCompiledCards.get("AD1-025") ?? getCompiledCard("AD1-025");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-025");
    expect(definition?.nameEn).toBe("Omnimon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("bottom-decks opponent Digimon with no more sources than itself, then deletes one", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "AD1-025", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "no-sources" },
            { card: "BT1-020", as: "with-sources", under: ["BT1-010", "BT1-015"] },
            { card: "BT9-103", as: "option" },
          ],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 15;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 1 &&
        s.state.players[1]!.trash.some((card) => card.cardId === "BT9-103"),
    );
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-019");
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([]);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT9-103")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security[0]?.cardId).toBe("BT1-002");
  });

  it("returns every opposing Digimon within its source-count ceiling before deleting one survivor", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-014", as: "base" }], hand: [{ card: "AD1-025", as: "omnimon" }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "zero" },
            { card: "BT1-020", as: "one", under: ["BT1-010"] },
            { card: "BT1-020", as: "two", under: ["BT1-010", "BT1-015"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.deck.slice(-2).map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-019", "BT1-020"]),
    );
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-020")).toBe(true);
  });

  it("publishes Raid, Blocker, and Partition", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-025", as: "omnimon" }] } });
    await s.ready();
    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(continuous.hasKeyword(s.perm("omnimon").permanentId, "Raid")).toBe(true);
    expect(continuous.hasKeyword(s.perm("omnimon").permanentId, "Blocker")).toBe(true);
    expect(continuous.hasKeyword(s.perm("omnimon").permanentId, "Partition")).toBe(true);
  });

  it("replays its WarGreymon and MetalGarurumon materials through Partition", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-025", as: "omnimon", under: ["AD1-004", "AD1-014"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("omnimon").permanentId], "byEffect")).toBe(1);
    await settle(
      () =>
        s.state.players[0]!.battleArea.length === 2 &&
        s.state.players[0]!.battleArea.every((permanent) => permanent.stack.length === 0),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["AD1-004", "AD1-014"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "AD1-025")).toBe(true);
  });

  it("trashes one opposing Option and top security card on the first opposing Digimon leave only", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-025", as: "omnimon" }] },
      1: {
        battleArea: [
          { card: "BT1-010", as: "leaving" },
          { card: "BT9-103", as: "option" },
        ],
        security: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("leaving").permanentId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT9-103")).toBe(true);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-002"]);

    s.putOnBoard(1, { card: "BT1-010", as: "second" });
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-002"]);
  });
});
