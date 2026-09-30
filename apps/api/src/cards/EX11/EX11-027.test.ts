import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { mindLinkMarvin } from "./qaRulings.testSupport.js";

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
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isLinked: true,
        actions: [
          expect.objectContaining({
            kind: "Replacement",
            event: "wouldLeavePlay",
            sourceFilter: { isSelfRef: true },
            cost: expect.objectContaining({
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: { filter: { isSelfRef: true, zone: "linked" }, from: ["linked"], count: 1 },
            }),
          }),
        ],
      }),
    );
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
  });

  it("keeps its host on the field by placing itself as the bottom digivolution card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-033", as: "host", linked: [{ card: cardId }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(s.perm("host").linked).toHaveLength(1);

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(true);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("host").stack.map(({ cardId: id }) => id)).toEqual([cardId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("prevents a public battle deletion by moving the link under its host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-033", as: "host", suspended: true, linked: [{ card: cardId, as: "link" }] }],
        },
        1: { battleArea: [{ card: "AD1-004", as: "attacker", dp: 20_000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const hostId = s.perm("host").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: hostId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 0);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(hostId);
    expect(s.perm("host").stack.map(({ cardId: id }) => id)).toEqual([cardId]);
    assertNoLoudGap(s);
  });

  it("lets its controller decline the link replacement and lose the host", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX11-033", as: "host", linked: [{ card: cardId }] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === hostId)).toBe(false);
    assertNoLoudGap(s);
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
      0: { breeding: { card: "EX11-006", as: "eligible" }, hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("eligible").permanentId,
        instanceId: valid.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "plain" }], hand: [{ card: cardId, as: "source" }] },
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

describe("EX11-027 Maquinamon — KB Q&A rulings", () => {
  it("adds a revealed card whose [Maquinamon] appears only in its requirements and effects (Q5822)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: cardId, as: "maquinamon" }],
          deck: [{ card: "EX11-029", as: "turbomon" }, "BT1-009", "BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("maquinamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("turbomon").instanceId]);
    expect(s.state.players[0]!.deck.map(({ cardId: id }) => id).sort()).toEqual(["BT1-009", "BT1-010"]);
  });

  it("triggers 'when digivolution cards are added' effects when its link effect places it at the bottom (Q5823)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-033", as: "host", under: ["EX11-045"], linked: [{ card: cardId, as: "link" }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-019", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("host").permanentId;
    const lowId = s.perm("low").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === lowId));

    expect(s.perm("host").stack[0]!.instanceId).toBe(s.inst("link").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([s.perm("high").permanentId]);
  });

  it("cannot place a card that <Mind Link> put in the digivolution cards, only a real link card (Q5824)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-040", as: "host", linked: [{ card: cardId, as: "link" }] },
            { card: "BT15-086", as: "marvin" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    const marvinId = s.inst("marvin").instanceId;
    await mindLinkMarvin(s, "marvin", "host");
    preferred.push(marvinId);
    const hostId = s.perm("host").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("host").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("link").instanceId, marvinId]);
    expect(s.decisions.some(({ req }) => req.options?.candidateInstanceIds?.includes(marvinId))).toBe(false);
  });
});
