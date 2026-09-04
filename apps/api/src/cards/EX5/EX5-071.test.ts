import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-071.js";
import "../index.js";

describe("EX5-071 Loyalty Deeper than the Sea", () => {
  it("waives color requirements with a Deva/Four Sovereigns Digimon and reveals three for a trait card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Sovereigns"] }],
        },
      },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        {
          count: 1,
          to: "placeUnder",
          underFilter: { controllerDefault: "mine", kind: ["Digimon"] },
          filter: { controllerDefault: "mine", nameOrTrait: [{ match: "trait", tokens: ["Deva", "Four Sovereigns"] }] },
          orDispositions: [{ to: "hand" }],
        },
      ],
      rest: "deckTopOrBottom",
    });
  });
  it("uses the public Main intent to place a revealed Deva under an own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "host" }],
          hand: [{ card: "EX5-071", as: "option" }],
          deck: ["BT10-079", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT10-079"));
    expect(s.perm("host").stack.some((card) => card.cardId === "BT10-079")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("adds a revealed Deva to hand when the public disposition choice selects hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "host" }],
          hand: [{ card: "EX5-071", as: "option" }],
          deck: ["BT10-079", "BT1-009", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoOrderCards: true,
      },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT10-079"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-079")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
  });

  it("does not place a revealed trait card when no own Digimon exists, per Q3683", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-095", as: "whiteTamer" }],
          hand: [{ card: "EX5-071", as: "option" }],
          deck: ["BT10-079", "BT1-009", "BT1-010"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 0,
        autoOrderCards: true,
      },
    );
    s.state.memory = 1;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT10-079")).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.stack.some((card) => card.cardId === "BT10-079")),
    ).toBe(false);
  });

  it("activates the same Main effect from public Security timing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-079", as: "host" }],
          security: [{ card: "EX5-071", as: "securityOption" }],
          deck: ["BT10-079", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.perm("host").stack.some((card) => card.cardId === "BT10-079"));
    expect(s.perm("host").stack.some((card) => card.cardId === "BT10-079")).toBe(true);
  });
});
