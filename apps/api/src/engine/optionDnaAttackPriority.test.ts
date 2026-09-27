import { expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

it("resolves Option DNA entry before the defender's attack watcher and prevents nested attacks", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT16-070", as: "purple" }, { card: "BT8-010", as: "red" }, "BT1-087"],
        hand: [{ card: "BT16-091", as: "option" }, "BT16-077"],
        trash: ["BT8-010"],
        deck: ["BT1-009", "BT1-009"],
      },
      1: { battleArea: ["BT11-092", "BT2-066"], security: ["BT1-009", "BT1-009"] },
    },
    { autoAcceptOptional: true, autoSelectCards: true, declinePrompts: ["Raid"] },
  );
  s.state.memory = 10;
  await s.ready();
  expect(
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
  ).toEqual({ ok: true });
  await settle();
  const effects = s.events.filter((e) => e.kind === "effectTriggered");
  expect(
    effects.filter((e) => e.sourceCardId === "BT16-077" || e.sourceCardId === "BT11-092").map((e) => e.sourceCardId),
  ).toEqual(["BT16-077", "BT11-092"]);
  expect(s.events.filter((e) => e.kind === "attackDeclared" && e.redirected !== true)).toHaveLength(1);
  expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT8-010")).toBe(true);
});
