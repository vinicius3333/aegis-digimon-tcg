import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-056.js";
import "../index.js";

describe("EX12-056 Cho-Hakkaimon", () => {
  it("maps the catalog, special evolution, DigiXros, Guard, Alliance attack, and inherited redirect clauses", () => {
    const card = getCardDefinition("EX12-056");

    expect(card?.effectText).toContain("＜Guard＞");
    expect(card?.effectText).toContain(
      "1 of your other [SW] trait Digimon may gain ＜Alliance＞ for the turn and attack",
    );
    expect(digivolutionRequirementsFor("EX12-056")).toEqual([
      { level: 4, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(digiXrosRequirementFor("EX12-056")).toEqual([
      {
        materials: [{ names: ["Gokuumon"], traits: ["SW"], texts: ["Gokuumon"] }],
        count: 2,
      },
    ]);

    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "DeDigivolve", amount: 1, target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Alliance" },
            optional: true,
            duration: "forTheTurn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [{ match: "trait", tokens: ["SW"] }],
              },
            },
          },
          {
            kind: "Attack",
            mandatory: true,
            condition: { kind: "ifThisEffectActed" },
            attackPlayer: true,
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, sameTarget: true },
          },
        ],
      });
    }
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

  it("uses Guard to delete itself and prevent an opponent-effect deletion of another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-056", as: "guard" },
            { card: "EX12-015", as: "protected" },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const protectedId = s.perm("protected").permanentId;
    const guardId = s.perm("guard").permanentId;
    const fx = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: string): Promise<number> } }
    ).primitives;
    await fx.deletePermanent([protectedId], "byEffect");
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === guardId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("EX12-056");
  });

  it("fires the real On Play resolution for De-Digivolve and the Alliance/attack sequence", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-056", as: "cho" },
            { card: "EX12-015", as: "ally" },
          ],
        },
        1: {
          battleArea: [{ card: "EX12-029", as: "opponent" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );

    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("cho"));
    await settle();
    expect(s.perm("opponent").topCard?.cardId).toBe("EX12-029");
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "effectResolved",
        sourceCardId: "EX12-056",
        timing: "OnPlay",
      }),
    );
  });

  it("redirects an opponent attack to Cho-Hakkaimon through the inherited once-per-turn watcher", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-015", as: "host", under: ["EX12-056"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    const choId = s.perm("host").permanentId;
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === choId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
  });
});
