import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-075.js";
import "./index.js";

describe("BT17-075 Eosmon", () => {
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

  it("redirects one attack once per turn to an unsuspended Eosmon", () => {
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
              target: {
                filter: { controller: "mine", unsuspended: true, nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
              },
            },
          ],
        },
      ],
    });
  });

  it("counts both players' Tamers for the on-play De-Digivolve", async () => {
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

  it("redirects a natural opponent attack only to an unsuspended Eosmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-074", suspended: true, as: "suspendedDecoy" },
            { card: "BT17-076", under: ["BT17-075"], as: "eosmon" },
          ],
        },
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
    expect(s.perm("suspendedDecoy").isSuspended).toBe(true);
  });
});
