import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { validateCompetitiveDeck } from "../../tournaments/participants/deckLegality.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-061.js";
import "./BT11-070.js";
import "./BT11-111.js";

describe("BT11-061 Vemmon", () => {
  it("maps the catalog facts and both printed effects to IR", () => {
    expect(getCardDefinition("BT11-061")).toMatchObject({
      cardId: "BT11-061",
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      maxCountInDeck: 50,
    });
    expect(compiled.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            rest: "deckBottom",
            add: [{ upTo: true, to: "hand" }, { to: "placeUnder" }],
          },
        ],
      },
      { trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn" },
    ]);
  });

  it("uses the printed 50-copy deckbuilding limit", () => {
    const legal = validateCompetitiveDeck({ mainDeck: Array(50).fill("BT11-061"), eggDeck: [] });
    const illegal = validateCompetitiveDeck({ mainDeck: [...Array(50).fill("BT11-061"), "BT11-061"], eggDeck: [] });
    expect(legal.violations.filter((v) => v.kind === "over_copy_limit")).toHaveLength(0);
    expect(illegal.violations).toContainEqual({ kind: "over_copy_limit", cardId: "BT11-061", copies: 51, allowed: 50 });
  });

  it("can place a revealed Vemmon even when no named search card is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "vemmon" }],
          deck: ["BT11-061", "BT11-061", "BT11-061"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("vemmon"));
    await settle(() => s.perm("vemmon").stack.length === 1);
    expect(s.perm("vemmon").stack[0]?.cardId).toBe("BT11-061");
  });

  it("may decline the named add while still placing a revealed Vemmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "vemmon" }],
          deck: ["BT11-105", { card: "BT11-061", as: "revealedVemmon" }, "BT1-009"],
        },
      },
      { autoOrderCards: true },
    );
    await s.ready();
    const resolving = advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("vemmon"));
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const addSelection = s.decisions.filter(({ req }) => req.kind === "selectCards").at(-1);
    expect(addSelection?.req.options).toMatchObject({ min: 0, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: addSelection!.req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "selectCards").length >= 2);
    const placeSelection = s.decisions.filter(({ req }) => req.kind === "selectCards").at(-1);
    expect(placeSelection?.req.options).toMatchObject({ min: 1, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placeSelection!.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("revealedVemmon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("vemmon").stack[0]?.cardId).toBe("BT11-061");
  });

  it("reduces a matching inherited digivolution cost only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-065",
              as: "host",
              under: [{ card: "BT11-061", as: "vemmon" }],
            },
          ],
          hand: [
            { card: "BT11-070", as: "destromon" },
            { card: "BT11-111", as: "galacticmon" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;

    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("destromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT11-070");
    expect(s.state.memory).toBe(6); // printed 5, reduced to 4

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("galacticmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT11-111");
    expect(s.state.memory).toBe(0); // printed 6; the once-per-turn reduction was consumed
  });
});
