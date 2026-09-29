import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, type CardSpec, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT6/BT6-061.js";
import { compiled } from "./BT9-090.js";
import "./BT9-090.js";

async function playMakiRevealing(deck: CardSpec[], battleArea: PermanentSpec[] = []) {
  const s = setupEngine(
    { 0: { hand: [{ card: "BT9-090", as: "maki" }], deck, battleArea } },
    { autoSelectCards: true },
  );
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maki").instanceId })).toEqual({ ok: true });
  const player = s.state.players[0] as PlayerState;
  const inHand = (alias: string) => player.hand.some((card) => card.instanceId === s.inst(alias).instanceId);
  return { s, player, inHand };
}

describe("BT9-090 Maki Himekawa", () => {
  it("matches catalog values and the reveal, cost reduction, and security IR", () => {
    expect(getCardDefinition("BT9-090")).toMatchObject({
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      securityEffectText: "[Security] Play this card without paying its memory cost.",
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                { filter: { nameOrTrait: [{ tokens: ["Tapirmon"], match: "name" }] } },
                { filter: { multicolor: true, colorCount: 2, colors: ["Black"] } },
              ],
              rest: "deckBottom",
            },
          ],
        },
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              into: { multicolor: true, colorCount: 2, colors: ["Black"] },
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              actions: [{ kind: "Replacement", mode: "reduceCost", amount: 1 }],
            },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] },
      ],
    });
  });

  it("adds Tapirmon and a two-color black card from three revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-090", as: "source" }],
          deck: [{ card: "BT9-059", as: "tapirmon" }, { card: "BT9-061", as: "black" }, "BT9-060"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("tapirmon").instanceId, s.inst("black").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});

describe("BT9-090 Maki Himekawa — KB Q&A rulings", () => {
  it("still adds a card when only a [Tapirmon] or only a two-color black card is revealed (Q1892)", async () => {
    const onlyTapirmon = await playMakiRevealing([
      { card: "BT9-059", as: "tapirmon" },
      { card: "BT9-060", as: "monoBlack" },
      { card: "BT1-010", as: "red" },
    ]);
    await settle(() => onlyTapirmon.inHand("tapirmon") && onlyTapirmon.player.deck.length === 2);
    expect(onlyTapirmon.inHand("monoBlack")).toBe(false);
    expect(onlyTapirmon.inHand("red")).toBe(false);

    const onlyTwoColorBlack = await playMakiRevealing([
      { card: "BT9-061", as: "blackRed" },
      { card: "BT9-060", as: "monoBlack" },
      { card: "BT1-010", as: "red" },
    ]);
    await settle(() => onlyTwoColorBlack.inHand("blackRed") && onlyTwoColorBlack.player.deck.length === 2);
    expect(onlyTwoColorBlack.inHand("monoBlack")).toBe(false);
    expect(onlyTwoColorBlack.inHand("red")).toBe(false);
  });

  it("cannot add a black Digimon that is only treated as red by its own effect (Q1893)", async () => {
    const { s, player, inHand } = await playMakiRevealing(
      [
        { card: "BT6-061", as: "gigadramon" },
        { card: "BT9-061", as: "printedBlackRed" },
        { card: "BT9-060", as: "monoBlack" },
      ],
      [{ card: "BT6-061", as: "gigadramonInPlay" }],
    );
    await settle(() => inHand("printedBlackRed") && player.deck.length === 2 && s.state.pendingDecision === undefined);

    expect(observe(s.engine).effectiveColors(s.perm("gigadramonInPlay"))).toEqual(
      expect.arrayContaining(["Black", "Red"]),
    );

    expect(inHand("gigadramon")).toBe(false);
    expect(player.deck.map((card) => card.instanceId)).toContain(s.inst("gigadramon").instanceId);
    const offered = s.decisions
      .filter(({ req }) => req.kind === "selectCards")
      .flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offered).toContain(s.inst("printedBlackRed").instanceId);
    expect(offered).not.toContain(s.inst("gigadramon").instanceId);
  });
});
