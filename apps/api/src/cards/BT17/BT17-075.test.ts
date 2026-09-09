import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-075.js";
import "./index.js";

describe("BT17-075 Eosmon", () => {
  it("matches the catalog printed text, level and inherited redirect line", () => {
    expect(getCardDefinition("BT17-075")).toMatchObject({
      cardId: "BT17-075",
      nameEn: "Eosmon",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [],
      inheritedEffectText:
        "[Opponent's Turn] [Once Per Turn] When an opponent's Digimon attacks, you may switch the attack target to 1 of your [Eosmon].",
    });
    const printed = getCardDefinition("BT17-075")!.effectText!;
    expect(printed).toContain("[Digivolve]Lv.4 [Eosmon]: Cost 3");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("offers the opponent a Tamer first, then conditionally offers a white low-cost Tamer", () => {
    for (const effect of [compiled.effects?.[0], compiled.effects?.[1]]) {
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Tamer"] }, upTo: true, chooser: "opponent" },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        optional: true,
        condition: { kind: "ifThisEffectDidNotAct" },
        target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["White"], playCostLte: 4 } },
      });
    }
  });

  it("always performs the scaled De-Digivolve step after the Tamer choices", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      scaling: { per: 2, unit: "cards", filter: { kind: ["Tamer"] } },
    });
    expect(compiled.effects?.[0]?.actions?.[2]).not.toHaveProperty("scalesCount");
    expect(compiled.effects?.[1]?.actions?.[2]).not.toHaveProperty("scalesCount");
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
    expect(compiled.effects?.[0]?.actions?.[2]?.scaling?.filter).not.toHaveProperty("controllerDefault");
  });

  it("gates the inherited redirect once per turn onto any of your Eosmon, without a suspension filter", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] } },
            },
          ],
        },
      ],
    });
    const redirectAction = (
      compiled.effects?.[2]?.actions?.[0] as { actions?: Array<{ target?: { filter?: Record<string, unknown> } }> }
    )?.actions?.[0];
    expect(redirectAction?.target?.filter).not.toHaveProperty("unsuspended");
  });

  it("uses the exact-name [Eosmon] Lv.4 cost-3 route (namesExact, no near-name in catalog)", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, namesExact: ["Eosmon"], cost: 3, isAlternate: true },
    ]);
  });

  // Q2843: the <De-Digivolve 1> fires even when neither player plays a Tamer.
  it("De-Digivolves once for two in-play Tamers with no Tamer played (Q2843)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-087", as: "ownTamer" }],
          hand: [{ card: "BT17-075", as: "eosmon" }],
        },
        1: {
          battleArea: [
            { card: "BT17-088", as: "opposingTamer" },
            { card: "BT17-071", under: ["BT17-063"], as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT17-063");

    expect(s.perm("target").topCard.cardId).toBe("BT17-063");
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.some((c) => c.cardId === "BT17-063")).toBe(false);
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT17-087")).toHaveLength(1);
    expect(s.state.memory).toBe(0);
  });

  it("repeats De-Digivolve 1 twice when four Tamers are in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-087", as: "ownTamerOne" },
            { card: "BT17-088", as: "ownTamerTwo" },
          ],
          hand: [{ card: "BT17-075", as: "eosmon" }],
        },
        1: {
          battleArea: [
            { card: "BT17-092", as: "opposingTamerOne" },
            { card: "BT17-093", as: "opposingTamerTwo" },
            { card: "BT17-071", under: ["BT17-063", "BT17-064"], as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT17-063");

    expect(s.perm("target").topCard.cardId).toBe("BT17-063");
    expect(s.state.players[1]!.trash.filter((c) => ["BT17-071", "BT17-064"].includes(c.cardId))).toHaveLength(2);
  });

  it("resolves the opponent-first and fallback Tamer branches before De-Digivolve", async () => {
    const opponentFirst = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-087", as: "ownTamer" }],
          hand: [{ card: "BT17-075", as: "eosmon" }],
        },
        1: {
          battleArea: [{ card: "BT17-071", under: ["BT17-063"], as: "opponentStack" }],
          hand: [{ card: "BT17-083", as: "opponentTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    opponentFirst.state.memory = 6;

    expect(
      opponentFirst.engine.applyIntent(0, { type: "playCard", instanceId: opponentFirst.inst("eosmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => opponentFirst.perm("opponentStack").topCard.cardId === "BT17-063");

    expect(opponentFirst.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT17-083")).toBe(true);
    const opponentPlayDecision = opponentFirst.decisions.find(
      ({ req }) =>
        req.kind === "selectCards" &&
        req.options?.candidateInstanceIds?.includes(opponentFirst.inst("opponentTamer").instanceId),
    );
    expect(opponentPlayDecision).toMatchObject({
      seat: 1,
      req: { options: { min: 0, max: 1 } },
    });
    expect(opponentFirst.perm("opponentStack").topCard.cardId).toBe("BT17-063");

    const fallback = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-087", as: "ownTamer" }],
          hand: [
            { card: "BT17-075", as: "fallbackEosmon" },
            { card: "BT16-090", as: "whiteTamer" },
          ],
        },
        1: { battleArea: [{ card: "BT17-071", under: ["BT17-063"], as: "fallbackStack" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    fallback.state.memory = 6;

    expect(
      fallback.engine.applyIntent(0, { type: "playCard", instanceId: fallback.inst("fallbackEosmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => fallback.perm("fallbackStack").topCard.cardId === "BT17-063");

    expect(fallback.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT16-090")).toBe(true);
    expect(fallback.perm("fallbackStack").topCard.cardId).toBe("BT17-063");
  });

  it("publicly digivolves a Lv.4 Eosmon through the printed [Eosmon] route for cost 3 with the bonus draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-074", under: ["BT17-063"], as: "base" }],
          hand: [
            { card: "BT17-075", as: "eosmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: [
            { card: "BT1-010", as: "drawn" },
            { card: "BT1-011", as: "extra" },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseId = s.perm("base").permanentId;
    const eosmonId = s.inst("eosmon").instanceId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: baseId, instanceId: eosmonId, useAlternateCost: true }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === eosmonId);

    expect(s.perm("base").topCard?.cardId).toBe("BT17-075");
    expect(s.perm("base").stack.map((c) => c.cardId)).toEqual(expect.arrayContaining(["BT17-074", "BT17-063"]));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(2);
  });

  it("refuses the digivolve route from a Lv.4 base that is not named Eosmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-063", as: "notEosmon" }],
          hand: [{ card: "BT17-075", as: "eosmon" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseId = s.perm("notEosmon").permanentId;
    const eosmonId = s.inst("eosmon").instanceId;

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: baseId, instanceId: eosmonId, useAlternateCost: true }),
    ).not.toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: baseId, instanceId: eosmonId })).not.toEqual({
      ok: true,
    });
    expect(s.perm("notEosmon").topCard?.cardId).toBe("BT17-063");
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === eosmonId)).toBe(true);
  });

  // Q2842: the redirect may switch onto an UNSUSPENDED [Eosmon].
  it("redirects a natural opponent attack onto an unsuspended Eosmon (Q2842)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-076", under: ["BT17-075"], as: "eosmon" }] },
        1: { battleArea: [{ card: "BT17-064", dp: 1000, as: "attacker" }] },
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
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId));

    const declared = s.events.filter((event) => event.kind === "attackDeclared").at(-1);
    expect(declared).toMatchObject({ target: { kind: "permanent", permanentId: s.perm("eosmon").permanentId } });
    expect(s.perm("eosmon").isSuspended).toBe(false);
  });

  // The printed text carries no suspension restriction: a SUSPENDED Eosmon is a legal redirect target.
  it("redirects a natural opponent attack onto a suspended Eosmon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-076", suspended: true, under: ["BT17-075"], as: "eosmon" }] },
        1: { battleArea: [{ card: "BT17-064", dp: 1000, as: "attacker" }] },
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
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId));

    const declared = s.events.filter((event) => event.kind === "attackDeclared").at(-1);
    expect(declared).toMatchObject({ target: { kind: "permanent", permanentId: s.perm("eosmon").permanentId } });
    expect(s.perm("eosmon").isSuspended).toBe(true);
  });

  it("offers the redirect only once per opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-076", under: ["BT17-075"], as: "eosmon" }],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT17-064", dp: 1000, as: "first" },
            { card: "BT17-063", dp: 1000, as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("first").instanceId));

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "attackDeclared").length >= 2);

    const declaredEvents = s.events.filter((event) => event.kind === "attackDeclared");
    const secondDeclared = declaredEvents.at(-1);
    expect(secondDeclared).toMatchObject({ target: { kind: "player" } });
    const redirectedOntoEosmon = declaredEvents.filter(
      (event) => event.target?.kind === "permanent" && event.target.permanentId === s.perm("eosmon").permanentId,
    );
    expect(redirectedOntoEosmon).toHaveLength(1);
  });
});
