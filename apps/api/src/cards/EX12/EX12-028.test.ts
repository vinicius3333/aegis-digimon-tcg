import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-028.js";
import "../index.js";

describe("EX12-028 Gusokumon", () => {
  it("maps the printed evolution routes, keywords, once-per-turn watcher, and inherited redirect", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["DS"], cost: 3, isAlternate: true }]);
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 4 },
          { color: "Black", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 4 },
          { color: "Yellow", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 4 },
          { color: "Black", level: 4 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Purple", level: 4 },
          { color: "Yellow", level: 4 },
        ],
      },
    ]);

    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.4 or lower w/[DS] trait)＞" }],
        }),
      ]),
    );
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenAttacking" }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("places one DS card, de-digivolves one opponent, and gains memory at 0 or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-028", as: "host" }],
          hand: [{ card: "EX12-023", as: "material" }],
        },
        1: {
          battleArea: [
            { card: "BT1-083", as: "target", under: ["BT1-001"] },
            { card: "BT1-013", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle(() => s.perm("host").stack.length === 1 && s.perm("target").stack.length === 0);

    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["EX12-023"]);
    expect(s.perm("target").topCard?.cardId).toBe("BT1-001");
    expect(s.state.memory).toBe(1);
  });

  it("does not resolve the dependent effects without a DS card in hand and is once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-028", as: "host" }] },
        1: {
          battleArea: [
            { card: "BT1-083", as: "target", under: ["BT1-001"] },
            { card: "BT1-013", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: s.perm("attacker").permanentId,
    });
    await settle();
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.state.memory).toBe(0);

    const withMaterial = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-028", as: "host" }], hand: [{ card: "EX12-023", as: "material" }] },
        1: {
          battleArea: [
            { card: "BT1-083", as: "target", under: ["BT1-001"] },
            { card: "BT1-013", as: "attacker" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    withMaterial.state.memory = 1;
    await withMaterial.ready();
    const event = { attackerPermanentId: withMaterial.perm("attacker").permanentId };
    await advance(withMaterial.engine).fireSubTrigger("whenAttacking", event);
    await settle(() => withMaterial.perm("host").stack.length === 1);
    await advance(withMaterial.engine).fireSubTrigger("whenAttacking", event);
    await settle();
    expect(withMaterial.perm("host").stack).toHaveLength(1);
    expect(withMaterial.state.memory).toBe(1);
  });

  it("redirects an opponent attack to an inherited DS Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-015", as: "host", under: ["EX12-028"] },
            { card: "EX12-023", as: "redirect" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const redirectId = s.perm("redirect").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === redirectId)).toBe(false);
  });

  it("registers through the compiled IR module", () => {
    expect(EffectTiming.None).toBeDefined();
    expect(compiled.effects).toHaveLength(4);
  });
});
