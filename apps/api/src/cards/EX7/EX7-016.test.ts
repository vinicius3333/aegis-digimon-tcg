import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX7-016.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX7-016 Bulucomon", () => {
  it("reveals three for Paledramon/Hexeblaumon and Ice-Snow cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("grants Ice-Snow as a rule and inherits once-per-turn top evolution trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Ice-Snow"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }],
    });
  });

  it("adds matching Paledramon and Ice-Snow cards from the top three", async () => {
    const s = setupEngine(
      { 0: { deck: ["BT5-025", "EX7-017", "BT1-009"], battleArea: [{ card: "EX7-016", as: "bulu" }] } },
      { autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("bulu"));
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.cardId === "BT5-025") &&
        s.state.players[0]!.hand.some((card) => card.cardId === "EX7-017"),
    );
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT5-025", "EX7-017"]));
    expect(s.state.players[0]!.deck.at(-1)?.cardId).toBe("BT1-009");
  });

  it("trashes one opposing top evolution card once per turn through its inherited effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX7-016"] }] },
        1: {
          security: ["BT1-001", "BT1-001"],
          battleArea: [{ card: "BT1-009", as: "target", under: ["EX7-017", "EX7-018"] }],
        },
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
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack[0]!.cardId).toBe("EX7-017");

    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => false, 20);
    expect(s.perm("target").stack).toHaveLength(1);
  });
});
