import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-076.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-076", () => {
  it("deletes the lowest-level own and opposing Digimon by trashing a hand card on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Delete", cost: { kind: "trash", target: { filter: { zone: "hand" } } }, target: { filter: { controller: "mine", superlative: "lowestLevel" } } }, { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestLevel" } } }]));
  it("plays an Agumon from trash and grants a Digimon Rush if Tai is present on deletion", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({ actions: [{ kind: "PlayWithoutCost", from: ["trash"] }, { kind: "GainKeyword", keyword: { keyword: "Rush" }, condition: { kind: "youHave" } }] }));
  it("trashes the hand cost and deletes the lowest own and opposing Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT14-076", as: "source" }], hand: [{ card: "BT1-002", as: "cost" }] }, 1: { battleArea: [{ card: "BT14-069", as: "opponent" }] } }, { autoSelectCards: true, autoAcceptOptional: true });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-076")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-069")).toBe(false);
  });
});
