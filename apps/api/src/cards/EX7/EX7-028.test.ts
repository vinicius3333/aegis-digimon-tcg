import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-028.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-028", () => {
  it("plays a yellow or NSp Digimon costing 4 or less from hand on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        count: 1,
        filter: { colors: ["Yellow"], playCostLte: 4 },
        orFilters: [{ nameOrTrait: [{ tokens: ["NSp"] }] }],
      },
    }));
  it("inherits a once-per-turn attack effect that gives an opposing Digimon -4000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000 }],
    }));

  it("plays a qualifying yellow Digimon from hand on deletion", async () => {
    const s = setupEngine(
      { 0: { hand: ["BT1-045"], battleArea: [{ card: "EX7-028", as: "pix" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("pix").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-045"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-045")).toBe(true);
  });

  it("also plays a non-yellow NSp Digimon from hand on deletion", async () => {
    const s = setupEngine(
      { 0: { hand: ["EX7-015"], battleArea: [{ card: "EX7-028", as: "pix" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("pix").permanentId]);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-015"));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX7-015")).toBe(true);
  });

  it("applies inherited -4000 DP once per turn when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-028"] }] },
        1: { security: ["BT1-045"], battleArea: [{ card: "EX7-037", as: "target", dp: 15000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 11000);
    expect(s.perm("target").currentDP).toBe(11000);
  });
});
