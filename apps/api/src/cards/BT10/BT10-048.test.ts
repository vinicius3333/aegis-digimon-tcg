import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-048.js";
import "./BT10-052.js";
describe("BT10-048 Sunflowmon", () => {
  it("matches its catalog and exact paid-play plus inherited watcher IR", () => {
    const d = getCardDefinition("BT10-048")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Green"], 4, 4, 3000]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 3, memoryCost: 2 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Champion"], ["Data"], ["Vegetation"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenDigivolving",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false, optional: true })],
      }),
      expect.objectContaining({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" }),
    ]);
  });

  it("suspends a green Digimon to play a 3000 DP Vegetation Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-067", as: "cost" },
            { card: "BT1-064", as: "base" },
          ],
          hand: [
            { card: "BT10-048", as: "evolving" },
            { card: "BT10-043", as: "played" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("played").instanceId),
    );
    expect(s.perm("cost").isSuspended).toBe(true);
  });

  it("draws for an allied effect suspension but not an opposing one", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-048"] },
          { card: "BT10-046", as: "ally" },
          { card: "BT10-043", as: "secondAlly" },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }, "BT1-002"],
      },
      1: { battleArea: [{ card: "BT10-020", as: "opponent" }] },
    });
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);

    await advance(s.engine).verb.suspend([s.perm("secondAlly").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("does not run the inherited watcher during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-048"] },
          { card: "BT10-046", as: "ally" },
        ],
        deck: ["BT1-001"],
      },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("ally").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not draw when Digisorption suspends a Digimon before digivolution completes (Q1974)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-048", as: "base" },
            { card: "BT10-046", as: "cost" },
          ],
          hand: [{ card: "BT10-052", as: "evolving" }],
          deck: [{ card: "BT1-001", as: "standardDraw" }, { card: "BT1-002" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-052");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("standardDraw").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
