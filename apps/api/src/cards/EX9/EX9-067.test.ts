import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-067.js";

describe("EX9-067", () => {
  it("reveals three and adds a Puppet LIBERATOR trait card", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand", filter: { nameOrTrait: [{ tokens: ["Puppet", "LIBERATOR"], match: "trait" }] } }] }));
  it("once per turn returns itself to deck bottom to play a Puppet or Arisa after a Puppet digivolves", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOneOfYoursDigivolves", cost: { kind: "return", to: "deckBottom" }, actions: [{ kind: "PlayWithoutCost", from: ["hand"], reduceCostBy: 3 }] }] }));
  it("plays itself from security without paying", () => expect(compiled.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] }));
});
