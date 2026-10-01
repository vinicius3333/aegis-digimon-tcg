import { describe, expect, it } from "vitest";
import { getCardDefinition, type Filter } from "@aegis/shared";
import { compiled } from "./BT14-097.js";
import { definitionMatches } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-097", () => {
  it("digivolves a non-white Digimon into Sukamon from hand without cost", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Digivolve", payCost: false, ignoreRequirements: true }],
    }));
  it("changes one opposing Digimon into a white 3000 DP Sukamon in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      actions: [{ kind: "GrantStatic", grant: { dp: 3000, color: "white", originalName: "Sukamon" } }],
    }));

  it("naturally free-digivolves a non-white Digimon into Sukamon from hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "base" },
            { card: "BT14-084", as: "yellowSource" },
          ],
          hand: [
            { card: "BT14-097", as: "option" },
            { card: "BT14-034", as: "sukamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-034");

    expect(s.perm("base").topCard?.cardId).toBe("BT14-034");
    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.state.memory).toBe(7);
  });

  it("naturally transforms an opposing Digimon when revealed in security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "target" },
            { card: "BT14-058", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT14-097", as: "securityOption" }] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(observe(s.engine).effectiveColors(s.perm("target"))).toEqual(["White"]);
    expect(observe(s.engine).effectiveNames(s.perm("target"))).toContain("sukamon");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT14-097")).toBe(true);
  });
});

describe("BT14-097 Suka's Curse — KB Q&A rulings", () => {
  const playOption = (s: ReturnType<typeof setupEngine>, alias: string) =>
    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId });

  it("digivolves a non-white Digimon of any level into a [Sukamon] card, but never a white Digimon (Q2473)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-086", as: "white" },
            { card: "BT2-064", as: "levelSix" },
            { card: "BT14-084", as: "yellowSource" },
          ],
          hand: [
            { card: "BT14-097", as: "option" },
            { card: "BT14-034", as: "sukamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    preferInstanceIds.push(s.perm("white").topCard!.instanceId);

    expect(playOption(s, "option")).toEqual({ ok: true });
    await settle(() => s.perm("levelSix").topCard?.cardId === "BT14-034");

    expect(s.perm("levelSix").topCard?.cardId).toBe("BT14-034");
    expect(s.perm("levelSix").stack.map((card) => card.cardId)).toEqual(["BT2-064"]);
    expect(s.perm("white").topCard?.cardId).toBe("BT12-086");
    expect(s.state.memory).toBe(7);
  });

  it("cannot digivolve a Digimon in the breeding area (Q2474)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", as: "raised" },
          battleArea: [
            { card: "BT2-064", as: "battler" },
            { card: "BT14-084", as: "yellowSource" },
          ],
          hand: [
            { card: "BT14-097", as: "option" },
            { card: "BT14-034", as: "sukamon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    preferInstanceIds.push(s.perm("raised").topCard!.instanceId);

    expect(playOption(s, "option")).toEqual({ ok: true });
    await settle(() => s.perm("battler").topCard?.cardId === "BT14-034");

    expect(s.perm("raised").topCard?.cardId).toBe("BT1-009");
    expect(s.perm("raised").stack).toHaveLength(0);
    expect(s.perm("battler").topCard?.cardId).toBe("BT14-034");
  });

  it("counts as a card with [Sukamon] in its name in the hand and in the trash (Q2475)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-062", as: "chuumon" },
            { card: "BT1-009", as: "handNearMiss" },
            { card: "BT14-097", as: "handCurse" },
          ],
          trash: [
            { card: "BT1-013", as: "trashNearMiss" },
            { card: "BT14-097", as: "trashCurse" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    preferInstanceIds.push(s.inst("handNearMiss").instanceId, s.inst("trashNearMiss").instanceId);

    expect(playOption(s, "chuumon")).toEqual({ ok: true });
    const player = s.state.players[0]!;
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("trashCurse").instanceId));

    const handIds = player.hand.map((card) => card.instanceId);
    const trashIds = player.trash.map((card) => card.instanceId);
    expect(trashIds).toContain(s.inst("handCurse").instanceId);
    expect(handIds).toContain(s.inst("trashCurse").instanceId);
    expect(handIds).toContain(s.inst("handNearMiss").instanceId);
    expect(trashIds).toContain(s.inst("trashNearMiss").instanceId);
  });

  it("is not treated as exactly [Sukamon], only as having [Sukamon] in its name (Q2476)", () => {
    const curse = getCardDefinition("BT14-097")!;
    const sukamon = getCardDefinition("BT14-034")!;
    const exactSukamon: Filter = { nameOrTrait: [{ tokens: ["Sukamon"], match: "nameExact" }] };
    const sukamonInName: Filter = { nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }] };

    expect(definitionMatches(exactSukamon, curse)).toBe(false);
    expect(definitionMatches(sukamonInName, curse)).toBe(true);
    expect(definitionMatches(exactSukamon, sukamon)).toBe(true);
  });

  it("cannot be chosen by an effect that looks for a Digimon with [Sukamon] in its name (Q2477)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-064", as: "base" },
            { card: "BT14-084", as: "yellowSource" },
          ],
          hand: [
            { card: "BT14-097", as: "option" },
            { card: "BT14-097", as: "otherCurse" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(playOption(s, "option")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    await settle();

    expect(s.perm("base").topCard?.cardId).toBe("BT2-064");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("otherCurse").instanceId]);
  });

  it("replaces the opposing Digimon's original name, color, and DP with [Sukamon], white, and 3000 (Q2478)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "target" },
            { card: "BT14-058", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT14-097", as: "securityOption" }] },
      },
      { autoSelectCards: true },
    );
    const view = observe(s.engine);
    expect(view.effectiveNames(s.perm("target"))).toContain("numemon");

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(view.effectiveColors(s.perm("target"))).toEqual(["White"]);
    expect(view.effectiveNames(s.perm("target"))).toContain("sukamon");
    expect(view.effectiveNames(s.perm("target"))).not.toContain("numemon");
  });
  const attackPlayer = (s: ReturnType<typeof setupEngine>, attacker: string) =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(attacker).permanentId,
      target: { kind: "player" },
    });

  const curseAndBombBoard = (
    targetUnder: { card: string; as: string }[],
    hand: { card: string; as: string }[] = [],
  ) => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-058", as: "target", under: targetUnder },
            { card: "BT2-060", as: "firstAttacker" },
            { card: "BT2-060", as: "secondAttacker" },
          ],
          hand,
          deck: ["BT2-052", "BT2-052", "BT2-052", "BT2-052"],
        },
        1: {
          security: [
            { card: "BT14-097", as: "curse" },
            { card: "BT14-098", as: "bomb" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 10;
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    return { s, preferInstanceIds };
  };

  it("drops a (Rule) name so a changed [Geremon] is only [Sukamon], not also [Numemon] (Q2479)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-035", as: "target" },
            { card: "BT15-035", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT14-097", as: "securityOption" }] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    await s.ready();
    const view = observe(s.engine);
    expect(view.grantedNames(s.perm("target"))).toContain("numemon");

    expect(attackPlayer(s, "attacker")).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(view.effectiveNames(s.perm("target"))).toEqual(["sukamon"]);
    expect(view.grantedNames(s.perm("target"))).not.toContain("numemon");
    expect(view.effectiveNames(s.perm("attacker"))).toContain("geremon");
    expect(view.grantedNames(s.perm("attacker"))).toContain("numemon");
  });

  it("keeps an effect-granted color, so a changed [Tyrannomon] is white and green (Q2480)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-005", as: "target" },
            { card: "BT14-058", as: "attacker" },
          ],
        },
        1: { security: [{ card: "BT14-097", as: "securityOption" }] },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    await s.ready();
    const view = observe(s.engine);
    expect([...view.effectiveColors(s.perm("target"))].sort()).toEqual(["Green", "Red"]);

    expect(attackPlayer(s, "attacker")).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect([...view.effectiveColors(s.perm("target"))].sort()).toEqual(["Green", "White"]);
    expect(view.effectiveNames(s.perm("target"))).toContain("sukamon");
  });

  it("stays a white 3000 DP [Sukamon] after it digivolves and after <De-Digivolve> (Q2481)", async () => {
    const { s, preferInstanceIds } = curseAndBombBoard(
      [{ card: "BT2-052", as: "levelThree" }],
      [{ card: "BT6-085", as: "eosmon" }],
    );
    const view = observe(s.engine);
    const expectSukamon = () => {
      expect(s.perm("target").currentDP).toBe(3000);
      expect(view.effectiveColors(s.perm("target"))).toEqual(["White"]);
      expect(view.effectiveNames(s.perm("target"))).toEqual(["sukamon"]);
    };

    expect(attackPlayer(s, "firstAttacker")).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    await advance(s.engine).finishAttack();
    expectSukamon();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("eosmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT6-085");
    expect(s.perm("secondAttacker").currentDP).toBe(9000);
    expectSukamon();

    preferInstanceIds.push(s.perm("target").topCard!.instanceId);
    expect(attackPlayer(s, "secondAttacker")).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT14-058");
    await advance(s.engine).finishAttack();

    expect(s.perm("target").topCard?.cardId).toBe("BT14-058");
    expectSukamon();
  });

  it("keeps the white [Sukamon] change but has no DP once a Tamer becomes the top card (Q2482)", async () => {
    const { s } = curseAndBombBoard([{ card: "BT14-086", as: "satsuki" }]);
    const view = observe(s.engine);

    expect(attackPlayer(s, "firstAttacker")).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    await advance(s.engine).finishAttack();
    expect(s.perm("target").currentDP).toBe(3000);

    expect(attackPlayer(s, "secondAttacker")).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT14-086");
    await advance(s.engine).finishAttack();

    expect(s.perm("target").topCard?.cardId).toBe("BT14-086");
    expect(view.effectiveColors(s.perm("target"))).toEqual(["White"]);
    expect(view.effectiveNames(s.perm("target"))).toEqual(["sukamon"]);
    expect(s.perm("target").currentDP).toBe(0);
  });
});
