import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-055.js";

describe("EX5-055 HeavyLeomon", () => {
  it("has Fortitude and removes an opposing Digimon's top evolution card then bottoms it if 6000 DP or less", () => {
    expect(compiled.effects?.[0]?.keywords?.[0]?.keyword).toBe("Fortitude");
    for (const trigger of ["WhenDigivolving", "OnDeletion"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        { kind: "DeDigivolve", amount: 1, target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } },
        {
          kind: "Return",
          to: "deckBottom",
          target: {
            count: 1,
            filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
          },
        },
      ]);
    }
  });
  it("returns an opposing Digimon at 4000 DP or less after an attack, otherwise unsuspends once per turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          bindResultAs: "endOfAttackReturned",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } } },
        },
        {
          kind: "Unsuspend",
          condition: { kind: "bindingEmpty", ref: "endOfAttackReturned" },
          target: { isSelf: true, filter: { isSelfRef: true } },
        },
      ],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, names: ["Leomon"], cost: 4, isAlternate: true }]);
  });

  it("de-digivolves and bottoms the resulting 6000-DP-or-less Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-049", as: "base" }], hand: [{ card: "EX5-055", as: "heavy" }] },
        1: { battleArea: [{ card: "BT1-021", as: "target", under: ["BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("heavy").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("de-digivolves and bottoms a target after public deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-055", as: "heavy" }] },
        1: { battleArea: [{ card: "BT1-021", as: "target", under: ["BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("heavy").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("returns a 4000-DP target after attacking and does not unsuspend", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-055", as: "heavy" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 4000 }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("heavy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009"));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(false);
    expect(s.perm("heavy").isSuspended).toBe(true);
  });

  it("unsuspends after attacking when no opposing 4000-DP-or-less target exists", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX5-055", as: "heavy" }] },
        1: { battleArea: [{ card: "BT1-021", as: "target", dp: 7000 }], security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("heavy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("heavy").isSuspended);
    expect(s.perm("heavy").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-021")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("heavy"), "Fortitude")).toBe(true);
  });
});
