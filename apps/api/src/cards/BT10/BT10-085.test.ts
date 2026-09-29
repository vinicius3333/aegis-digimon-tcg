import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT10-085.js";
import "../BT23/BT23-013.js";
import "../BT23/BT23-076.js";
import "../BT6/BT6-015.js";
import "../BT6/BT6-084.js";
import "../ST12/ST12-13.js";

describe("BT10-085 Sistermon Ciel", () => {
  it("offers Jesmon X only the compatible level-5 base when another Jesmon X is also in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-011", as: "firstLegalBase" },
          { card: "BT10-011", as: "secondLegalBase" },
          { card: "BT10-016", as: "illegalJesmonXBase" },
        ],
        hand: [
          { card: "BT10-085", as: "source" },
          { card: "BT10-016", as: "jesmonXInHand" },
        ],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const baseDecision = s.decisions.at(-1)!.req;
    expect(new Set(baseDecision.options?.candidateInstanceIds)).toEqual(
      new Set([s.perm("firstLegalBase").permanentId, s.perm("secondLegalBase").permanentId]),
    );
    expect(baseDecision.options?.candidateInstanceIds).not.toContain(s.perm("illegalJesmonXBase").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: baseDecision.decisionId,
        response: {
          kind: "chooseTargets",
          instanceIds: [s.perm("illegalJesmonXBase").permanentId],
        },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(baseDecision.decisionId);
  });

  it("does not evolve Jesmon X into another Jesmon X through the exact [Jesmon] alternate path", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-016", as: "jesmonXBase" }],
          hand: [
            { card: "BT10-085", as: "source" },
            { card: "BT10-016", as: "jesmonXInHand" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    );
    await settle();

    expect(s.perm("jesmonXBase").topCard.instanceId).not.toBe(s.inst("jesmonXInHand").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("jesmonXInHand").instanceId);
    expect(s.state.memory).toBe(6);
  });

  it("may digivolve one of your Digimon into a Royal Knight from hand on your turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-085", as: "source" },
            { card: "BT10-016", as: "royal" },
          ],
          battleArea: [{ card: "BT10-011", as: "base" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").topCard.cardId === "BT10-016" && s.state.memory === 4);
    expect(s.perm("base").stack.some((c) => c.cardId === "BT10-011")).toBe(true);
    expect(s.state.memory).toBe(4);
  });

  it("gains memory only once when two Huckmon or Royal Knight evolutions happen in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-085", as: "sistermonCiel" },
            { card: "BT6-015", as: "firstBase" },
            { card: "BT6-015", as: "secondBase" },
          ],
          hand: [
            { card: "BT10-016", as: "jesmonX" },
            { card: "ST12-10", as: "jesmon" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("jesmonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 8);
    expect(s.state.memory).toBe(8);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("jesmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard.cardId === "ST12-10");
    await settle();

    expect(s.state.memory).toBe(4);
  });
});

describe("BT10-085 Sistermon Ciel — KB Q&A rulings", () => {
  const jesmonSistermonCandidates = async (withSistermonCielInPlay: boolean) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-015", as: "saviorHuckmon" },
            ...(withSistermonCielInPlay ? [{ card: "BT10-085", as: "sistermonCielInPlay" }] : []),
          ],
          hand: [
            { card: "BT23-013", as: "jesmon" },
            { card: "BT6-084", as: "dualNameCiel" },
            { card: "ST12-13", as: "starterDualNameCiel" },
          ],
          trash: [{ card: "BT23-076", as: "differentlyNamedBlanc" }],
          deck: ["BT1-009", "BT1-009"],
          security: 1,
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoSelectCards: true,
        declineDigiXros: true,
      },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("saviorHuckmon").permanentId,
        instanceId: s.inst("jesmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();

    return {
      offered: s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []),
      sameNameIds: [s.inst("dualNameCiel").instanceId, s.inst("starterDualNameCiel").instanceId],
      blancId: s.inst("differentlyNamedBlanc").instanceId,
      handIds: s.state.players[0]!.hand.map((card) => card.instanceId),
      battleAreaTops: s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId),
    };
  };

  it("stops BT23-013 Jesmon from playing a Sistermon Ciel that is also Sistermon Noir while this card is in play (Q5224)", async () => {
    const withCiel = await jesmonSistermonCandidates(true);
    expect(withCiel.offered).not.toContain(withCiel.sameNameIds[0]);
    expect(withCiel.offered).not.toContain(withCiel.sameNameIds[1]);
    expect(withCiel.handIds).toEqual(expect.arrayContaining(withCiel.sameNameIds));
    expect(withCiel.battleAreaTops).not.toContain(withCiel.sameNameIds[0]);
    expect(withCiel.battleAreaTops).not.toContain(withCiel.sameNameIds[1]);
    expect(withCiel.battleAreaTops).toContain(withCiel.blancId);

    const withoutCiel = await jesmonSistermonCandidates(false);
    expect(withoutCiel.offered).toEqual(expect.arrayContaining([...withoutCiel.sameNameIds, withoutCiel.blancId]));
  });
});
