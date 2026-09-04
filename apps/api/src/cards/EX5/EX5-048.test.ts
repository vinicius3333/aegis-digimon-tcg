import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-048.js";

describe("EX5-048 Etemon", () => {
  it("reduces one opposing Digimon by 3000 and grants that same Digimon a start-of-main-phase attack effect", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions;
    expect(actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -3000,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "dpTarget" },
    });
    expect(actions?.[1]).toMatchObject({
      kind: "GainEffect",
      target: { fromSelectionRef: "dpTarget" },
      grant: {
        trigger: "StartOfYourMainPhase",
        actions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, isSelf: true } }],
      },
      duration: "untilOpponentTurnEnd",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "ModifyDP", target: { bindAs: "dpTarget" } },
      { kind: "GainEffect", target: { fromSelectionRef: "dpTarget" } },
    ]);
  });
  it("inherits a once-per-turn reveal-three play of a black or yellow low-cost Digimon when an opponent attacks", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              rest: "trash",
              add: [
                {
                  count: 1,
                  to: "play",
                  optional: true,
                  filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Black", "Yellow"], playCostLte: 3 },
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it("reduces an opposing Digimon and makes that same Digimon attack at its owner's main phase", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-048", as: "etemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 7000 }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("etemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("victim").currentDP === 4000);
    expect(s.perm("victim").currentDP).toBe(4000);

    s.state.turnSeat = 1;
    await advance(s.engine).fireGlobal(EffectTiming.StartOfYourMainPhase);
    await settle(() =>
      s.events.some(
        (event) => event.kind === "attackDeclared" && event.attackerPermanentId === s.perm("victim").permanentId,
      ),
    );
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "attackDeclared", attackerPermanentId: s.perm("victim").permanentId }),
    );
  });

  it("uses the Sukamon alternate evolution route for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT11-040", as: "base" }], hand: [{ card: "EX5-048", as: "etemon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("etemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX5-048");
    expect(s.perm("base").topCard.cardId).toBe("EX5-048");
    expect(s.state.memory).toBe(0);
  });

  it("rejects the Sukamon alternate evolution route from a non-Sukamon base", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "EX5-048", as: "etemon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("etemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT1-009");
  });

  it("optionally reveals and plays only an eligible card, trashing the other revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-049", as: "host", under: ["EX5-048"] }],
          deck: ["BT1-045", "BT1-015", "EX5-047"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009"] },
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
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-045"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "BT1-045")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-015", "EX5-047"]);
  });

  it("can decline the inherited reveal without moving cards from the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-049", as: "host", under: ["EX5-048"] }],
          deck: ["BT1-045", "BT1-015", "EX5-047"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
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
    await settle();
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-045", "BT1-015", "EX5-047"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
