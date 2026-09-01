import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-099.js";
import "../index.js";

describe("BT26-099 compiled fidelity", () => {
  it("records the DM reveal, Delay watcher, and Security Main shape while preserving the Delay seam", () => {
    const card = compiled;
    expect(getCardDefinition("BT26-099")).toMatchObject({
      nameEn: "Training Manual",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 3,
      types: ["DM"],
    });
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    });
    expect(card.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHave", filter: { kind: ["Digimon", "Tamer"] } },
        },
      ],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "Main")?.actions).toMatchObject([
      {
        kind: "RevealAdd",
        revealCount: 3,
        rest: "deckBottom",
        add: [{ count: 1, to: "hand" }],
      },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect(card?.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          addedDigivolutionCardFilter: { faceDown: true },
          actions: [{ kind: "Digivolve", target: { sourceRef: "triggerSubject" }, payCost: false }],
        },
      ],
    });
    expect(card.effects.find((effect) => effect.trigger === "Main")?.actions[0]).not.toHaveProperty("add.0.optional");
  });

  it("waives the green use requirement only while its controller has a DM card", async () => {
    const withoutDm = setupEngine({ 0: { hand: [{ card: "BT26-099", as: "manual" }] } });
    withoutDm.state.memory = 3;
    await withoutDm.ready();
    expect(
      withoutDm.engine.applyIntent(0, { type: "playCard", instanceId: withoutDm.inst("manual").instanceId }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const withDmOption = setupEngine({
      0: {
        battleArea: [{ card: "P-205", as: "dmOption" }],
        hand: [{ card: "BT26-099", as: "manual" }],
      },
    });
    withDmOption.state.memory = 3;
    await withDmOption.ready();
    expect(
      withDmOption.engine.applyIntent(0, { type: "playCard", instanceId: withDmOption.inst("manual").instanceId }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });

    const withDm = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-077", as: "dm" }],
          hand: [{ card: "BT26-099", as: "manual" }],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    withDm.state.memory = 3;
    await withDm.ready();
    expect(withDm.engine.applyIntent(0, { type: "playCard", instanceId: withDm.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => withDm.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099"));
    expect(withDm.state.memory).toBe(0);
  });

  it("must add a revealed DM card even when optional choices are declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-036", as: "greenSource" }],
          hand: [{ card: "BT26-099", as: "manual" }],
          deck: [
            { card: "P-205", as: "dmOption" },
            { card: "BT1-009", as: "rest" },
            { card: "BT1-010", as: "rest2" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099") &&
        s.state.players[0]!.deck.length === 2,
    );

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("dmOption").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("rest").instanceId, s.inst("rest2").instanceId]),
    );
  });

  it("publicly resolves its Security Main, adds a DM card, and places itself in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT26-099", as: "manual", faceUp: true }],
          deck: [
            { card: "BT26-048", as: "dm" },
            { card: "BT1-009", as: "rest" },
            { card: "BT1-010", as: "rest2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("manual"));
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-099"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-048");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-099");
  });

  it("consumes Delay on a later turn and evolves the Digimon that received a face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          // Legal stack: a face-down bottom card, then Lv.3 Soundbirdmon → Lv.4 DM/Cyborg Raremon → Lv.5 Megadramon.
          battleArea: [
            {
              card: "EX9-064",
              as: "host",
              under: [
                { card: "BT1-009", as: "faceDown", faceUp: false },
                { card: "EX9-046", as: "base" },
                { card: "EX9-052", as: "intermediary" },
              ],
            },
          ],
          hand: [{ card: "BT26-099", as: "manual" }],
          deck: [
            { card: "BT26-077", as: "reapermon" },
            { card: "BT1-001", as: "rest" },
            { card: "BT1-002", as: "rest2" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009", "EX9-046", "EX9-052"]);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("manual").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099"));
    s.perm("manual").enterFieldTurnCount = -1;
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-077");

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("faceDown").instanceId],
    });

    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-099");
    expect(s.perm("host").topCard.cardId).toBe("BT26-077");
  });

  it("does not consume Delay for a face-up digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-099", as: "manual" },
            { card: "EX9-064", as: "host", under: [{ card: "BT1-009", as: "faceUp", faceUp: true }] },
          ],
          hand: [{ card: "BT26-077", as: "reapermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("manual").enterFieldTurnCount = -1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("faceUp").instanceId],
    });

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099")).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("EX9-064");
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT26-077")).toBe(true);
  });

  it("cannot activate Delay during the same turn this Option entered the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-099", as: "manual" },
            { card: "EX9-064", as: "host", under: [{ card: "BT1-009", as: "faceDown", faceUp: false }] },
          ],
          hand: [{ card: "BT26-077", as: "reapermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("manual").enterFieldTurnCount = s.state.turnCount;
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("faceDown").instanceId],
    });

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099")).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("EX9-064");
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT26-077")).toBe(true);
  });

  it("does not activate Delay when the only DM card exceeds the level-six limit", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-099", as: "manual" },
            { card: "EX9-064", as: "host", under: [{ card: "BT1-009", as: "faceDown", faceUp: false }] },
          ],
          hand: [{ card: "EX9-021", as: "levelSeven" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("manual").enterFieldTurnCount = -1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("host").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("faceDown").instanceId],
    });

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099")).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("EX9-064");
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX9-021")).toBe(true);
  });

  it("does not trigger when a face-down card is placed under a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-099", as: "manual" },
            { card: "BT26-096", as: "tamer", under: [{ card: "BT1-009", as: "faceDown", faceUp: false }] },
          ],
          hand: [{ card: "BT26-077", as: "reapermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("manual").enterFieldTurnCount = s.state.turnCount - 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("tamer").permanentId,
      addedDigivolutionCardInstanceIds: [s.inst("faceDown").instanceId],
    });

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-099")).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT26-077")).toBe(true);
  });
});
