import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-027";

describe("EX11-027 Maquinamon", () => {
  it("reveals Maquinamon cards, bottoms the rest, and links this Digimon to another Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-033", as: "ally", dp: 3000 }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
          deck: ["EX11-027", "EX11-073", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("maquinamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ally").linked.length === 1, 600);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-073");
    expect(s.state.players[0]!.deck.map(({ cardId: id }) => id)).toEqual(["BT1-009"]);
    expect(s.perm("ally").linked).toHaveLength(1);
    expect(s.perm("ally").linked[0]!.cardId).toBe("EX11-027");
    expect(s.perm("ally").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });

  it("recognizes a card with [Maquinamon] in its effect text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-012", as: "ally", dp: 3000 }],
          hand: [{ card: "EX11-027", as: "maquinamon" }],
          deck: ["EX11-033", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maquinamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX11-033"), 600);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX11-033")).toBe(true);
  });

  it("records complete compiled coverage after the link behavior is implemented", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Maquinamon",
      colors: ["Green", "Black"],
      level: 3,
      playCost: 3,
      dp: 1000,
      maxCountInDeck: 50,
      linkDp: 2000,
      linkRequirement: "[Link] [Maquinamon] in text: Cost 2",
      types: ["Composite", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({ trigger: "OnPlay" });
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
    });
    expect(compiled.effects[0]?.actions[1]).toMatchObject({ kind: "Link", payCost: false, optional: true });
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
  });

  it("may decline the free link after resolving the mandatory reveal", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-033", as: "ally" }],
          hand: [{ card: cardId, as: "source" }],
          deck: ["EX11-027", "EX11-073", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);
    expect(s.perm("ally").linked).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("uses the printed Maquinamon-text evolution route only on an eligible level 2 stack", () => {
    const valid = setupEngine({
      0: { battleArea: [{ card: "EX11-006", as: "eligible" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("eligible").permanentId,
        instanceId: valid.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "plain" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plain").permanentId,
        instanceId: invalid.inst("source").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
