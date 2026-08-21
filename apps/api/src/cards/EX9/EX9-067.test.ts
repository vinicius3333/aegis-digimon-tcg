import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-067.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-067", () => {
  it("reveals three and adds a Puppet LIBERATOR trait card", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand", filter: { nameOrTrait: [{ tokens: ["Puppet", "LIBERATOR"], match: "trait" }] } }] }));
  it("once per turn returns itself to deck bottom to play a Puppet or Arisa after a Puppet digivolves", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", cost: { kind: "return", to: "deckBottom" }, actions: [{ kind: "PlayWithoutCost", from: ["hand"], reduceCostBy: 3 }] }] }));
  it("plays itself from security without paying", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
  it("requires a Puppet digivolution and returns this Tamer before the optional reduced-cost play", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] }, resultFilter: { nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] }, cost: { kind: "return", to: "deckBottom", target: { isSelf: true, count: 1 } }, actions: [{ kind: "PlayWithoutCost", optional: true, from: ["hand"], payCost: true, reduceCostBy: 3, target: { count: 1, filter: { controller: "mine", orFilters: [{ kind: ["Tamer"], nameOrTrait: [{ tokens: ["Arisa Kinosaki"], match: "name" }] }, { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] }] } } }] }));

  it("reveals three and adds a Puppet card while returning the rest to the deck bottom", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-067", as: "source" }], deck: ["BT1-009", "EX9-024", "BT1-010"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0].hand.some((card) => card.cardId === "EX9-024") && s.state.players[0].deck.length === 2, 40);
    expect(s.state.players[0].hand.some((card) => card.cardId === "EX9-024")).toBe(true);
    expect(s.state.players[0].deck).toHaveLength(2);
  });
});
