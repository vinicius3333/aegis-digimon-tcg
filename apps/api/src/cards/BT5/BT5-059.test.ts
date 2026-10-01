import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-059.js";

describe("BT5-059 Keramon", () => {
  it("uses exact-name matching for the Arata Sanada reveal slot", () => {
    expect(runtimeCompiledCard("BT5-059")?.effects[0]?.actions[0]).toMatchObject({
      add: expect.arrayContaining([
        expect.objectContaining({
          filter: expect.objectContaining({
            nameOrTrait: [{ tokens: ["Arata Sanada"], match: "nameExact" }],
          }),
        }),
      ]),
    });
  });

  it("adds an Unidentified Digimon and Arata Sanada from the revealed cards", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-059", as: "source" }],
          deck: [
            { card: "BT5-063", as: "unidentified" },
            { card: "BT5-067", as: "unidentifiedOther" },
            { card: "BT5-090", as: "arata" },
            { card: "BT22-091", as: "arataOther" },
            { card: "BT5-060", as: "remainder" },
            { card: "BT5-061", as: "untouched" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const player = s.state.players[0]!;
    preferred.push(s.inst("unidentified").instanceId, s.inst("arata").instanceId);
    const added = [s.inst("unidentified").instanceId, s.inst("arata").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => added.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck[0]!.instanceId).toBe(s.inst("untouched").instanceId);
    expect(
      player.deck
        .slice(1)
        .map((card) => card.instanceId)
        .sort(),
    ).toEqual(
      [s.inst("unidentifiedOther"), s.inst("arataOther"), s.inst("remainder")].map((card) => card.instanceId).sort(),
    );
    expect(player.hand.map((card) => card.instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("unidentifiedOther").instanceId, s.inst("arataOther").instanceId]),
    );
  });

  it("adds the available category when only one eligible category is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-059", as: "source" }],
          deck: [{ card: "BT5-063", as: "unidentified" }, "BT5-060", "BT5-061", "BT5-062", "BT5-064"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("unidentified").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("unidentified").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(4);
  });

  it("adds Arata Sanada when no Unidentified Digimon is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-059", as: "source" }],
          deck: [{ card: "BT5-090", as: "arata" }, "BT5-060", "BT5-061", "BT5-062", "BT5-064"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("arata").instanceId));
    expect(player.hand.some((card) => card.instanceId === s.inst("arata").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(4);
  });
});

describe("BT5-059 Keramon — KB Q&A rulings", () => {
  it("adds the one revealed category even when the other category is missing (Q1335)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-059", as: "source" }],
          deck: [
            { card: "BT5-090", as: "arata" },
            { card: "BT5-060", as: "crtDigimon" },
            { card: "BT5-061", as: "missA" },
            { card: "BT5-062", as: "missB" },
            { card: "BT5-064", as: "missC" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("arata").instanceId));

    expect(player.hand.map((card) => card.instanceId)).toEqual([s.inst("arata").instanceId]);
    expect(player.deck.some((card) => card.instanceId === s.inst("crtDigimon").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(4);
  });

  it("adds exactly 1 Unidentified Digimon card and 1 Arata Sanada card (Q1336)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-059", as: "source" }],
          deck: [
            { card: "BT5-063", as: "unidentifiedA" },
            { card: "BT5-067", as: "unidentifiedB" },
            { card: "BT5-090", as: "arataA" },
            { card: "BT5-090", as: "arataB" },
            { card: "BT5-060", as: "crtDigimon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    const unidentifiedIds = [s.inst("unidentifiedA").instanceId, s.inst("unidentifiedB").instanceId];
    const arataIds = [s.inst("arataA").instanceId, s.inst("arataB").instanceId];
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.length === 2);
    await settle(() => player.deck.length === 3);

    const handIds = player.hand.map((card) => card.instanceId);
    expect(handIds.filter((id) => unidentifiedIds.includes(id))).toHaveLength(1);
    expect(handIds.filter((id) => arataIds.includes(id))).toHaveLength(1);
    expect(player.deck.some((card) => card.instanceId === s.inst("crtDigimon").instanceId)).toBe(true);
  });
});
