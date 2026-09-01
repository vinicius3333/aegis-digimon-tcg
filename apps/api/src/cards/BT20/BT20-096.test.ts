import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-096.js";
import "./index.js";

describe("BT20-096 Black Sabbath", () => {
  it("gates the trash activation's deletion on the 6-memory return cost", () => {
    const effect = compiled.effects.find((entry) => entry.isFromTrash);
    expect(effect).toMatchObject({
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
          cost: { kind: "payMemory", memory: 6 },
          abortOnDecline: true,
        },
        { kind: "Delete", target: { filter: { controller: "opponent", unsuspended: true } } },
      ],
    });
  });

  it("trashes one hand card before deleting an opposing level 4 or lower Digimon", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Main" && !entry.isFromTrash)).toMatchObject({
      actions: [
        { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
        { kind: "Delete", target: { filter: { controller: "opponent", levelComparison: { op: "lte", value: 4 } } } },
      ],
    });
  });

  it("naturally trashes a hand card and deletes an opposing level 4 or lower Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT20-096", as: "option" },
            { card: "BT1-010", as: "discard" },
          ],
          battleArea: ["BT20-062"],
        },
        1: { battleArea: [{ card: "BT20-062", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-010");
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT20-062");
  });
});
