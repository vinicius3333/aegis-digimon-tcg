import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { compiled } from "./EX9-045.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-045", () => {
  it("has Alliance and Blocker", () => {
    const statics = compiled.effects?.filter((entry) => entry.keywords?.length);
    expect(statics?.flatMap((entry) => entry.keywords)).toEqual(expect.arrayContaining([{ keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Blocker", raw: "＜Blocker＞" }]));
  });
  it("plays a WG Digimon costing seven or less from hand on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], target: { filter: { playCostLte: 7 } } }));
  it("returns up to two opponent Digimon to the bottom of the deck during DNA digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "PlayWithoutCost" }, { kind: "Return", target: { count: 2, upTo: true }, to: "deckBottom", condition: { kind: "isDnaDigivolving" } }] }));
  it("uses a live leave-play replacement for the all-turns WG rescue", () => expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", leaveCause: "otherThanBattle", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false }] }] }));
  it("plays an eligible WG card from hand without cost when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-045", as: "source" }], hand: ["EX9-040"] } }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => player.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-040"));
    expect(player.battleArea.some((permanent) => permanent.topCard.cardId === "EX9-040")).toBe(true);
  });
});
