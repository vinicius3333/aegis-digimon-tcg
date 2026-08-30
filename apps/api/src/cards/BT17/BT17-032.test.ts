import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-032.js";

describe("BT17-032", () => {
  it("plays Rika Nonaka on digivolution if you do not already have one", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHaveNone" } },
      ],
    });
  });

  it("has inherited cost 2+ option Security Attack -1", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }],
        },
      ],
    });
  });

  it("reduces an opposing Digimon's Security Attack after a cost 2 option", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-033", as: "host", under: ["BT17-032"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 2, subjectPermanentId: "option-used" });
    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
  });

  it("plays Rika from hand on a real digivolution when none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-032", as: "kyubimon" }],
          hand: [{ card: "BT17-085", as: "rika" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("kyubimon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-085"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-085")).toBe(true);
  });

  it("does not play Rika on digivolution when one is already in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-032", as: "kyubimon" }, { card: "BT17-085", as: "existing-rika" }],
        hand: [{ card: "BT17-085", as: "second-rika" }],
      },
    });
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("kyubimon"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT17-085"]);
    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT17-085")).toHaveLength(1);
  });

  it("triggers the inherited watcher after a real cost-2 Option use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-033", under: ["BT17-032"], as: "host" }],
          hand: [{ card: "BT1-102", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT1-102"));

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
