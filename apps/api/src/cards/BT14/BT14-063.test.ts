import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-063.js";

describe("BT14-063", () => {
  it("on deletion reveals three to add Monzaemon and play Numemon without cost", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand", filter: { nameOrTrait: [{ tokens: ["Monzaemon"], match: "name" }] } }, { to: "play", payCost: false, filter: { nameOrTrait: [{ tokens: ["Numemon"], match: "name" }] } }] }));
  it("inherits Blocker", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" }));

it("exposes inherited Blocker on the host Digimon", async () => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT14-042", as: "host", under: ["BT14-063"] }] } });
  await s.ready();
  expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
});
});
