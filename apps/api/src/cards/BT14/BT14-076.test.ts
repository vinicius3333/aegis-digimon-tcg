import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-076.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT14-076", () => {
  it("deletes the lowest-level own and opposing Digimon by trashing a hand card on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "Delete",
        cost: { kind: "trash", target: { filter: { zone: "hand" } } },
        target: { filter: { controller: "mine", superlative: "lowestLevel" } },
      },
      { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestLevel" } } },
    ]));
  it("plays an Agumon from trash and grants a Digimon Rush if Tai is present on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["trash"], bindResultAs: "playedAgumon" },
        {
          kind: "GainKeyword",
          target: { filter: { boundRef: "playedAgumon" } },
          keyword: { keyword: "Rush" },
          condition: { kind: "youHave" },
        },
      ],
    }));
  it("legally digivolves, trashes the hand cost, and deletes the lowest own and opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT5-010", as: "base" },
            { card: "BT14-080", as: "other" },
            { card: "BT1-085", as: "tai" },
          ],
          hand: [
            { card: "BT14-076", as: "source" },
            { card: "BT1-002", as: "cost" },
          ],
          trash: [{ card: "ST1-03", as: "agumon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT14-069", as: "opponent" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002") &&
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST1-03"),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-076")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Rush")).toBe(false);
  });
});
