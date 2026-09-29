import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("ST21-03", () => {
  it("matches the catalog and executable security clause", () => {
    expect(getCardDefinition("ST21-03")?.effectText).toContain("At the end of the battle");
    const effect = runtimeCompiledCard("ST21-03")?.effects.find((x) => x.trigger === "Security");
    expect(effect?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } });
  });
  it("restricts only opponent Digimon without evolution cards after removing two sources", () => {
    const effect = runtimeCompiledCard("ST21-03")?.effects.find((x) => x.trigger === "OnPlay");
    expect(effect?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "TrashDigivolution", amount: 2, fromTop: true }),
        expect.objectContaining({ kind: "Restrict", restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }),
      ]),
    );
  });

  it("plays through the public intent, trashes exactly two sources, and leaves the target source-less", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST21-03", as: "ikkakumon" }] },
        1: { battleArea: [{ card: "BT1-021", as: "target", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ikkakumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 0);

    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
  });
});

describe("ST21-03 Ikkakumon — KB Q&A rulings", () => {
  it("keeps the attack and block lock after the Digimon gains a digivolution card (Q4698)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST21-03", as: "ikkakumon" }] },
        1: {
          battleArea: [
            { card: "ST1-09", as: "locked", under: ["ST1-03", "ST1-02"] },
            { card: "ST1-09", as: "free", under: ["ST1-03", "ST1-02", "ST1-03"] },
          ],
          hand: [{ card: "ST1-10", as: "phoenixmon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("locked").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ikkakumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("locked").stack.length === 0 && s.state.pendingDecision === undefined);
    expect(s.perm("free").stack).toHaveLength(3);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("phoenixmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locked").topCard.cardId === "ST1-10" && s.state.pendingDecision === undefined);
    expect(s.perm("locked").stack.map(({ cardId }) => cardId)).toEqual(["ST1-09"]);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("locked").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(observe(s.engine).isRestricted(s.perm("locked"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("locked"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("free"), "attack")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("free").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });
});
