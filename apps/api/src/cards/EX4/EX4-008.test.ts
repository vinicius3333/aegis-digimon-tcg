import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition, type DecisionResponse } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-008.js";
import "../index.js";

function respond(s: EngineSetup, response: DecisionResponse): void {
  const decision = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(decision.seat, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response,
    }),
  ).toEqual({ ok: true });
}

describe("EX4-008 BlackGrowlmon", () => {
  it("has the official identity and trashes both decks before the optional return", () => {
    expect(getCardDefinition("EX4-008")).toMatchObject({
      cardId: "EX4-008",
      nameEn: "BlackGrowlmon",
      colors: ["Red", "Purple"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Red", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
    });
    const effect = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions?.[0]).toMatchObject({ kind: "TrashTopDeck", controller: "both", amount: 2 });
    expect(effect?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      target: {
        filter: {
          zone: "trash",
          controller: "mine",
          nameOrTrait: [
            { match: "nameExact", tokens: ["Guilmon"] },
            { match: "name", tokens: ["Growlmon", "Gallantmon"] },
          ],
        },
        count: 1,
      },
    });
  });

  it.each([
    ["red level 3", "BT1-010", false, 0],
    ["purple level 3", "BT10-071", false, 0],
    ["Guilmon in name", "BT9-009", true, 1],
  ])("digivolves through the printed %s route", async (_route, baseCard, useAlternateCost, expectedMemory) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-008", as: "blackGrowlmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blackGrowlmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-008");

    expect(s.state.memory).toBe(expectedMemory);
  });
  it("inherits the same optional return after deletion", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
    });
  });

  it("trashes two cards from both decks and may return a matching card", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-010", "BT1-011"],
          trash: ["BT12-007"],
          battleArea: [{ card: "EX4-008", as: "blackGrowlmon" }],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("blackGrowlmon"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT12-007"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-007")).toBe(false);
  });

  it("offers exact Guilmon and name-containing Growlmon/Gallantmon cards but excludes Guilmon X", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-008", as: "blackGrowlmon" }],
          trash: [
            { card: "BT12-007", as: "guilmon" },
            { card: "BT9-009", as: "guilmonX" },
            { card: "BT5-076", as: "blackGrowlmonCandidate" },
            { card: "EX4-013", as: "medievalGallantmon" },
            { card: "BT1-010", as: "filler" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();

    const flow = advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("blackGrowlmon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const candidates = s.decisions.at(-1)!.req.options?.candidateInstanceIds ?? [];
    expect(candidates).toEqual(
      expect.arrayContaining([
        s.inst("guilmon").instanceId,
        s.inst("blackGrowlmonCandidate").instanceId,
        s.inst("medievalGallantmon").instanceId,
      ]),
    );
    expect(candidates).not.toContain(s.inst("guilmonX").instanceId);
    expect(candidates).not.toContain(s.inst("filler").instanceId);
    respond(s, { kind: "selectCards", instanceIds: [s.inst("guilmon").instanceId] });
    await flow;

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("guilmon").instanceId);
  });

  it("Q3442/Q3443 still trashes as many cards as possible when the return is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-008", as: "blackGrowlmon" }],
          deck: ["BT1-010"],
          trash: [{ card: "BT12-007", as: "guilmon" }],
        },
        1: { deck: ["BT1-011"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("blackGrowlmon"));

    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("guilmon").instanceId);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX4-008" && req.kind === "optional")).toHaveLength(1);
  });

  it("returns a matching trash card after the host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          trash: [
            { card: "BT9-009", as: "guilmonX" },
            { card: "BT12-007", as: "guilmon" },
          ],
          battleArea: [{ card: "BT4-009", as: "host", under: ["EX4-008"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT12-007"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT12-007")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-007")).toBe(false);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("guilmonX").instanceId);
  });
});
