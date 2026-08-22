import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-042.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-042", () => it("reveals three and adds a green card by suspending itself", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", cost: { kind: "suspend" }, add: [{ to: "hand", filter: { colors: ["Green"] } }] })));

it("adds the revealed green card and suspends itself", async () => {
  const s = setupEngine({ 0: { hand: [{ card: "BT14-042", as: "source" }], deck: ["BT14-044", "BT1-001", "BT1-002"] } }, { autoSelectCards: true, autoAcceptOptional: true });
  s.state.memory = 10;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-044"));
  expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-044")).toBe(true);
  expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-042" && perm.isSuspended)).toBe(true);
});
