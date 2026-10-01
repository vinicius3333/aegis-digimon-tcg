import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-023.js";
import "../index.js";

describe("BT16-023", () => {
  it("unsuspends your Digimon and bottoms an opposing level 4 or lower Digimon", () => {
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Unsuspend",
        condition: { kind: "securityAtLeast", value: 3 },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Return",
        to: "deckBottom",
        condition: { kind: "securityAtMost", value: 3 },
      });
    }
  });

  it("has the inherited Pulsemon security-cost unsuspend", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      frequency: "OncePerTurn",
    });
    expect(compiled.effects?.[2]?.actions?.[0]).toMatchObject({
      kind: "Unsuspend",
      optional: true,
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "security", position: "top" } } },
    });
  });

  it("naturally executes both branches at exactly 3 security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT16-023", as: "source" }],
          battleArea: [{ card: "BT16-018", as: "ally", suspended: true }],
          security: 3,
        },
        1: { battleArea: [{ card: "BT16-018", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ally").permanentId, s.perm("target").permanentId);
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("ally").isSuspended && s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT16-018");
  });

  it("naturally resolves the inherited security-cost unsuspend at End of Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-047", as: "host", under: ["BT16-023"], suspended: false }],
          security: ["BT1-001"],
        },
        1: { security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended && s.state.players[0]!.security.length === 0);

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});

describe("BT16-023 Divemon — KB Q&A rulings", () => {
  const digivolveIntoDivemon = async (securityCount: number) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-018", as: "base" },
            { card: "BT16-018", as: "ally", suspended: true },
          ],
          hand: [{ card: "BT16-023", as: "divemon" }],
          deck: ["BT1-009", "BT1-010"],
          security: securityCount,
        },
        1: { battleArea: [{ card: "BT16-018", as: "target" }] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("ally").permanentId,
      s.perm("ally").topCard.instanceId,
      s.perm("target").permanentId,
      s.perm("target").topCard.instanceId,
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("divemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-023" && !s.perm("ally").isSuspended);
    await drainMicrotasks();
    return s;
  };

  it("resolves both the unsuspend and the bottom-deck return with exactly 3 security cards (Q2618)", async () => {
    const exactlyThree = await digivolveIntoDivemon(3);
    expect(exactlyThree.perm("ally").isSuspended).toBe(false);
    expect(exactlyThree.state.players[1]!.battleArea).toHaveLength(0);
    expect(exactlyThree.state.players[1]!.deck.at(-1)?.cardId).toBe("BT16-018");

    const four = await digivolveIntoDivemon(4);
    expect(four.perm("ally").isSuspended).toBe(false);
    expect(four.state.players[1]!.battleArea).toHaveLength(1);
  });
});
