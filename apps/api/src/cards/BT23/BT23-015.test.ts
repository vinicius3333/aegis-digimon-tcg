import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-015.js";

describe("BT23-015 Phoenixmon", () => {
  it("matches every catalog clause and shares one use across all three timings", () => {
    expect(getCardDefinition("BT23-015")).toMatchObject({
      cardId: "BT23-015",
      nameEn: "Phoenixmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Zaxon", "CS"],
      effectText:
        "[Digivolve] Lv.5 w/[CS]\u00a0trait: Cost 3 \n\nWhen this card would be played, if you have a Tamer with the [Zaxon]\u00a0trait, reduce the play cost by 5.\n[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with 9000 DP or less. Then, you may return up to 3 non-Digi-Egg cards from their trash to the bottom of the deck.\n[On Deletion] Place this card face up as the bottom security card.",
    });

    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "youHave",
            filter: {
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Zaxon"], match: "trait" }],
            },
          },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger) as any;
      expect(effect).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
      expect(effect.actions).toMatchObject([
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 9000 } },
            count: 1,
          },
        },
        {
          kind: "Return",
          target: {
            filter: { zone: "trash", controller: "opponent", kind: ["Digimon", "Tamer", "Option"] },
            count: 3,
            upTo: true,
          },
          to: "deckBottom",
          optional: true,
        },
      ]);
    }
    expect(compiled.effects.find((entry) => entry.trigger === "OnDeletion")!.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "mine",
      toTop: false,
      faceUp: true,
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("pays exactly 6 with a Zaxon Tamer and cannot complete the unreduced play at 0 memory", async () => {
    const reduced = setupEngine({
      0: { battleArea: [{ card: "BT23-086", as: "zaxon" }], hand: [{ card: "BT23-015", as: "phoenix" }] },
    });
    reduced.state.memory = 10;
    expect(reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("phoenix").instanceId })).toEqual(
      {
        ok: true,
      },
    );
    await settle(() =>
      reduced.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-015"),
    );
    expect(reduced.state.memory).toBe(4);

    const full = setupEngine({ 0: { hand: [{ card: "BT23-015", as: "phoenix" }] } });
    full.state.memory = 0;
    expect(full.engine.applyIntent(0, { type: "playCard", instanceId: full.inst("phoenix").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(full.state.players[0]!.hand).toHaveLength(1);
    expect(full.state.players[0]!.battleArea).toHaveLength(0);
    expect(full.state.memory).toBe(0);
  });

  it("deletes at exactly 9000 DP, then returns that card before its pending On Deletion can activate, per Q5230", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-015", as: "phoenix" }] },
        1: {
          battleArea: [{ card: "BT23-012", as: "garudamon", dp: 9000 }],
          hand: [{ card: "BT23-011", as: "birdramon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const deletedInstanceId = s.inst("garudamon").instanceId;
    preferred.push(deletedInstanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("phoenix"));
    await settle(() => s.state.players[1]!.deck.some((card) => card.instanceId === deletedInstanceId));

    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(deletedInstanceId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === deletedInstanceId)).toBe(false);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("birdramon").instanceId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("returns at most 3 non-Digi-Egg cards to deck bottom even when no deletion occurs", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-015", as: "phoenix" }] },
        1: {
          deck: [{ card: "BT1-009", as: "deckTop" }],
          trash: [
            { card: "BT1-009", as: "digimon" },
            { card: "BT1-085", as: "tamer" },
            { card: "BT1-109", as: "option" },
            { card: "BT1-009", as: "fourth" },
            { card: "BT23-001", as: "egg" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const returned = [s.inst("digimon").instanceId, s.inst("tamer").instanceId, s.inst("option").instanceId];

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("phoenix"));
    await settle(() => s.state.players[1]!.deck.length === 4);

    expect(s.state.players[1]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
    expect(s.state.players[1]!.deck.slice(-3).map((card) => card.instanceId)).toEqual(returned);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("fourth").instanceId, s.inst("egg").instanceId]),
    );
  });

  it("allows the optional trash return to be refused without moving cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT23-015", as: "phoenix" }] },
        1: { trash: [{ card: "BT1-009", as: "card" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("phoenix"));
    await settle();
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("card").instanceId);
    expect(s.state.players[1]!.deck).toHaveLength(0);
  });

  it("shares Once Per Turn across timings per Phoenixmon but tracks two sources independently", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-015", as: "first" },
            { card: "BT23-015", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-059", as: "one" },
            { card: "BT1-059", as: "two" },
            { card: "BT1-059", as: "three" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const oneId = s.perm("one").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("first"));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === oneId));
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("first"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(2);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("second"));
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("places itself face up at security bottom, checks while revealed, and shuffles face down, per Q5231-Q5234", async () => {
    const checked = setupEngine({
      0: {
        battleArea: [{ card: "BT23-015", as: "phoenix" }],
        security: [{ card: "BT1-009", as: "existing" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    checked.state.turnSeat = 1;
    const phoenixId = checked.inst("phoenix").instanceId;
    expect(await advance(checked.engine).verb.deletePermanent([checked.perm("phoenix").permanentId], "byEffect")).toBe(
      1,
    );
    await settle(() => checked.state.players[0]!.security.length === 2);
    expect(checked.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      checked.inst("existing").instanceId,
      phoenixId,
    ]);
    expect(checked.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: phoenixId, faceUp: true });

    await advance(checked.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(
      checked.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: checked.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => checked.state.players[0]!.security.length === 0);
    expect(checked.state.players[0]!.trash.some((card) => card.instanceId === phoenixId)).toBe(true);

    const preferred: string[] = [];
    const shuffled = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-087", as: "tk" }],
          security: [
            { card: "BT1-001", as: "selected" },
            { card: "BT23-015", as: "phoenix", faceUp: true },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(shuffled.inst("selected").instanceId);
    await shuffled.ready();
    await advance(shuffled.engine).fire(EffectTiming.OnPlay, shuffled.perm("tk"));
    expect(shuffled.state.players[0]!.security).toHaveLength(1);
    expect(shuffled.state.players[0]!.security[0]).toMatchObject({ cardId: "BT23-015", faceUp: false });
  });

  it("digivolves for 3 from an off-color level-5 CS Digimon and rejects an off-color non-CS base", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT22-023", as: "base" }],
        hand: [{ card: "BT23-015", as: "phoenix" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("phoenix").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === legal.inst("phoenix").instanceId);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-041", as: "base" }], hand: [{ card: "BT23-015", as: "phoenix" }] },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("phoenix").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
