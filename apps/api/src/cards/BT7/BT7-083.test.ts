import { describe, expect, it } from "vitest";
import { effectiveExactNames, getCardDefinition, type PlayerState } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-083.js";
import "./BT7-082.js";
import "../BT14/BT14-102.js";

describe("BT7-083 Sistermon Ciel (Awakened)", () => {
  it("keeps the printed Rule name alias", () => {
    expect(runtimeCompiledCard("BT7-083")?.effects.find((effect) => effect.trigger === "Rule")).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          grant: "name",
          tokens: ["Sistermon Noir (Awakened)"],
        },
      ],
    });
  });

  it("limits the deletion cost source to Sistermon Ciel in hand or trash", () => {
    expect(runtimeCompiledCard("BT7-083")?.effects[0]?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      target: {
        from: ["hand", "trash"],
        filter: { nameOrTrait: [{ tokens: ["Sistermon Ciel"], match: "nameExact" }] },
      },
      underFilter: { isSelfRef: true },
      position: "bottom",
      optional: true,
      abortOnDecline: true,
    });
  });

  it("places Sistermon Ciel under itself to delete a play-cost-5 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-083", as: "source" },
            { card: "BT6-084", as: "material" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-034", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 0);
    const source = (s.state.players[0] as PlayerState).battleArea.find((p) => p.topCard?.cardId === "BT7-083");
    expect(source?.stack.some((c) => c.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});

describe("BT7-083 Sistermon Ciel (Awakened) — KB Q&A rulings", () => {
  const offeredCandidates = (s: ReturnType<typeof setupEngine>, sourceCardId: string) =>
    s.decisions
      .filter(({ req }) => req.sourceCardId === sourceCardId)
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);

  it("cannot place a [Sistermon Ciel (Awakened)] from hand or trash for the [On Play] cost (Q1648)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-083", as: "source" },
            { card: "BT7-083", as: "awakenedInHand" },
            { card: "BT6-084", as: "plainCiel" },
          ],
          trash: [{ card: "BT20-084", as: "awakenedInTrash" }],
        },
        1: { battleArea: [{ card: "BT1-034", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    const player = s.state.players[0] as PlayerState;
    const opponent = s.state.players[1] as PlayerState;
    const awakenedIds = [s.inst("awakenedInHand").instanceId, s.inst("awakenedInTrash").instanceId];
    preferInstanceIds.push(...awakenedIds);
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => opponent.battleArea.length === 0);

    const source = player.battleArea.find((p) => p.topCard?.instanceId === s.inst("source").instanceId);
    expect(source?.stack.map((c) => c.instanceId)).toEqual([s.inst("plainCiel").instanceId]);
    for (const awakenedId of awakenedIds) expect(offeredCandidates(s, "BT7-083")).not.toContain(awakenedId);
    expect(player.hand.map((c) => c.instanceId)).toContain(awakenedIds[0]);
    expect(player.trash.map((c) => c.instanceId)).toContain(awakenedIds[1]);
  });

  it("[On Deletion] can return [BaoHuckmon], [SaviorHuckmon], or [Sistermon Blanc (Awakened)] from trash (Q1649)", async () => {
    for (const returnable of ["BT6-011", "BT6-015", "BT7-082"]) {
      const preferInstanceIds: string[] = [];
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT1-084", as: "attacker" }] },
          1: {
            battleArea: [{ card: "BT7-083", as: "ciel", suspended: true }],
            trash: [
              { card: "BT7-083", as: "excluded" },
              { card: returnable, as: "returnable" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
      );
      const owner = s.state.players[1] as PlayerState;
      const excludedId = s.inst("excluded").instanceId;
      preferInstanceIds.push(excludedId);

      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("ciel").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => owner.hand.length > 0);

      expect(owner.hand.map((c) => c.instanceId)).toEqual([s.inst("returnable").instanceId]);
      expect(offeredCandidates(s, "BT7-083")).not.toContain(excludedId);
      expect(owner.trash.map((c) => c.instanceId)).toContain(excludedId);
    }
  });

  it("is always also named [Sistermon Noir (Awakened)] and has the [Virus] trait (Q1650)", async () => {
    const definition = getCardDefinition("BT7-083")!;
    expect(effectiveExactNames(definition)).toEqual(
      expect.arrayContaining(["Sistermon Ciel (Awakened)", "Sistermon Noir (Awakened)"]),
    );
    expect(definition.attributes).toEqual(expect.arrayContaining(["Data", "Virus"]));

    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-102", as: "angemon" }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT7-083", as: "ciel" },
            { card: "BT7-082", as: "vaccine" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferInstanceIds },
    );
    const opponent = s.state.players[1] as PlayerState;
    const cielInstanceId = s.perm("ciel").topCard!.instanceId;
    preferInstanceIds.push(s.perm("vaccine").topCard!.instanceId);
    await s.ready();

    const liveNames = (alias: string) =>
      observe(s.engine)
        .effectiveNames(s.perm(alias))
        .map((name) => name.toLowerCase());
    expect(liveNames("ciel")).toEqual(
      expect.arrayContaining(["sistermon ciel (awakened)", "sistermon noir (awakened)"]),
    );
    expect(liveNames("vaccine")).not.toContain("sistermon noir (awakened)");
    expect(observe(s.engine).hasEffectiveTrait(s.perm("ciel"), "Virus")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("vaccine"), "Virus")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("angemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.security.some((c) => c.instanceId === cielInstanceId));

    expect(opponent.security.map((c) => c.cardId)).toEqual(["BT1-009", "BT7-083"]);
    expect(opponent.battleArea.map((p) => p.topCard?.cardId)).toEqual(["BT7-082"]);
  });
});
