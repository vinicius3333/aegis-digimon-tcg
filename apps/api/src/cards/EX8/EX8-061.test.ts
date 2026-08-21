import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-061.js";

describe("EX8-061", () => {
  it("has Scapegoat and once-per-turn attacks may play a level 4 or lower DS/Mollusk/Crustacean Digimon from trash with at least 1 memory", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({
      keyword: "Scapegoat",
      raw: "＜Scapegoat＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          condition: { kind: "memoryAtLeast", value: 1 },
        },
      ],
    });
  });
  it("inherits an optional On Deletion play from trash with the same level and trait limits", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    }));
  it("plays the exact eligible DS card from trash during an attack when memory is at least 1", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX8-061", as: "source" }], trash: ["EX8-058", "BT1-010"] }, 1: { security: ["BT1-016"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    const player = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("source").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-058"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-058")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "EX8-058")).toBe(false);
  });
  it("plays the exact eligible DS card from trash through the inherited On Deletion effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT19-062", as: "host", under: ["EX8-061"] }], trash: ["EX8-058", "BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-058"));
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-058")).toBe(true);
    expect(player.trash.some((card) => card.cardId === "EX8-058")).toBe(false);
  });
});
