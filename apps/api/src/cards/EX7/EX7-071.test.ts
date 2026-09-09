import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-071.js";
import "../index.js";

describe("EX7-071 Hurricane Screw Shot", () => {
  it("matches the catalog and fully registered IR", () => {
    expect(getCardDefinition("EX7-071")).toMatchObject({
      cardId: "EX7-071",
      nameEn: "Hurricane Screw Shot",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 6,
      types: ["Three Musketeers"],
      securityEffectText:
        "[Security] Delete 1 of your opponent's level 3 Digimon, level 4 Digimon, and level 5 Digimon.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-071")).toBe(true);
  });

  it("maps the inherited memory gain, color waiver, three deletions, placement, and Security actions", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.isInherited)?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        requireByEffect: true,
        actions: [{ kind: "GainMemory", amount: 1 }],
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && !entry.isInherited)?.actions).toMatchObject([
      { kind: "WaiveColorRequirement", condition: { kind: "youHave" } },
    ]);
    const main = compiled.effects?.find((entry) => entry.trigger === "Main")?.actions ?? [];
    expect(main.slice(0, 3)).toMatchObject([
      { kind: "Delete", target: { filter: { levels: [3] } } },
      { kind: "Delete", target: { filter: { levels: [4] } } },
      { kind: "Delete", target: { filter: { levels: [5] } } },
    ]);
    expect(main[3]).toMatchObject({ kind: "PlaceUnder" });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toHaveLength(3);
  });

  it("deletes one opposing level 3, 4, and 5, preserves level 6, then places itself under a Musketeer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-071", as: "hurricane" }], battleArea: [{ card: "EX7-059", as: "musketeer" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "levelThree" },
            { card: "BT1-014", as: "levelFour" },
            { card: "BT1-038", as: "levelFive" },
            { card: "EX7-023", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hurricane").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.instanceId).toBe(s.inst("levelSix").instanceId);
    expect(s.perm("musketeer").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("hurricane").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("gains memory when EX7-059 publicly trashes this stack card as its attack cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-059", as: "host", under: [{ card: "EX7-071", as: "hurricane" }] }],
          hand: [{ card: "EX7-066", as: "used" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("hurricane").instanceId);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("used").instanceId);
  });

  it("rejects the purple Option without a purple source or Three Musketeers waiver", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "EX7-071", as: "hurricane" }], battleArea: [{ card: "BT1-009", as: "ordinary" }] },
      1: { battleArea: [{ card: "BT1-009", as: "levelThree" }] },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hurricane").instanceId })).toMatchObject({
      ok: false,
    });
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("hurricane").instanceId);
  });

  it("deletes one level 3, 4, and 5 during a real Security check while preserving level 6 and 7", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX7-071", as: "hurricane" }, "BT1-009"] },
        1: {
          battleArea: [
            { card: "EX7-037", as: "attacker" },
            { card: "BT1-009", as: "levelThree" },
            { card: "BT1-014", as: "levelFour" },
            { card: "BT1-038", as: "levelFive" },
            { card: "EX7-023", as: "levelSix" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toEqual(
      expect.arrayContaining([s.inst("attacker").instanceId, s.inst("levelSix").instanceId]),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});
