import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11-015 Frigimon", () => {
  it("encodes the Ice-Snow evolution, exact Tamer ceiling, optional free play, and inherited Jamming", () => {
    const compiled = runtimeCompiledCard("EX11-015")!;

    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Ice-Snow"], cost: 2, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: {
            kind: "permanentCount",
            op: "lte",
            value: 1,
            filter: { controllerDefault: "mine", kind: ["Tamer"] },
          },
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Suzune Kazuki"], match: "nameExact" }] },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Jamming", raw: "＜Jamming＞" }],
      }),
    );
    expect(compiled.effects.some((effect) => effect.isSecurity)).toBe(false);
  });

  it("uses the alternate cost 2 and plays Suzune with zero Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-014", as: "base" }],
          hand: [
            { card: "EX11-015", as: "frigimon" },
            { card: "EX11-057", as: "suzune" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("frigimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-057"));

    expect(s.perm("base").topCard.cardId).toBe("EX11-015");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("suzune").instanceId)).toBe(false);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("still plays Suzune at the one-Tamer boundary", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-014", as: "base" },
            { card: "EX11-056", as: "existingTamer" },
          ],
          hand: [
            { card: "EX11-015", as: "frigimon" },
            { card: "EX11-057", as: "suzune" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("frigimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("suzune").instanceId),
    );

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "EX11-057")).toHaveLength(
      1,
    );
    assertNoLoudGap(s);
  });

  it("does not play Suzune when two Tamers are already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-014", as: "base" },
            { card: "EX11-056", as: "firstTamer" },
            { card: "EX11-057", as: "secondTamer" },
          ],
          hand: [
            { card: "EX11-015", as: "frigimon" },
            { card: "EX11-057", as: "heldSuzune" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("frigimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX11-015");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("heldSuzune").instanceId);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "EX11-057")).toHaveLength(
      1,
    );
    assertNoLoudGap(s);
  });

  it("may decline the free play while eligible", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-014", as: "base" }],
          hand: [
            { card: "EX11-015", as: "frigimon" },
            { card: "EX11-057", as: "suzune" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("frigimon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX11-015");

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("suzune").instanceId);
    assertNoLoudGap(s);
  });

  it("grants Jamming only while inherited and survives the corresponding security battle", async () => {
    const inherited = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX11-015"] }] },
      1: { security: ["BT1-081"] },
    });
    await inherited.ready();
    const hostId = inherited.perm("host").permanentId;

    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Jamming")).toBe(true);
    expect(
      inherited.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => inherited.state.players[1]!.security.length === 0 && !observe(inherited.engine).isAttacking());
    expect(inherited.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);

    const standalone = setupEngine({
      0: { battleArea: [{ card: "EX11-015", as: "frigimon" }] },
      1: { security: ["BT1-081"] },
    });
    await standalone.ready();
    const frigimonId = standalone.perm("frigimon").permanentId;
    expect(observe(standalone.engine).hasKeyword(standalone.perm("frigimon"), "Jamming")).toBe(false);
    expect(
      standalone.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: frigimonId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      standalone.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== frigimonId),
    );
    expect(standalone.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === frigimonId)).toBe(
      false,
    );
    assertNoLoudGap(inherited);
    assertNoLoudGap(standalone);
  });

  it("supports normal blue/yellow cost 3 routes and rejects an off-color level 3", async () => {
    async function assertNormalEvolution(baseCardId: string): Promise<void> {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX11-015", as: "frigimon" }] },
      });
      s.state.memory = 3;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("frigimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX11-015");
      expect(s.state.memory).toBe(0);
    }

    await assertNormalEvolution("BT1-029");
    await assertNormalEvolution("BT1-045");

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "EX11-015", as: "frigimon" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redBase").permanentId,
        instanceId: invalid.inst("frigimon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
