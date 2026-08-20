import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT25-061.js";

const CARD_ID = "BT25-061";

describe("BT25-061 Offmon", () => {
  it("evolves for 0 from an off-color Lv.2 Appmon and rejects a non-Appmon", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: { breeding: { card: "BT21-005", as: "base" }, hand: [{ card: CARD_ID, as: "offmon" }], deck: ["BT1-009"] },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("offmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === CARD_ID);
    expect(legal.state.memory).toBe(0);

    const invalid = setupEngine({
      0: { breeding: { card: "BT1-007", as: "plain" }, hand: [{ card: CARD_ID, as: "offmon" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plain").permanentId,
        instanceId: invalid.inst("offmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("pays one Appmon card, then draws and gains memory as one effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "offmon" }],
          hand: [
            { card: "BT21-005", as: "cost" },
            { card: "BT1-009", as: "plain" },
          ],
          deck: [{ card: "BT1-013", as: "drawn" }],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("offmon"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("plain").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("may decline the cost and receives neither benefit", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CARD_ID, as: "offmon" }],
        hand: [{ card: "BT21-005", as: "cost" }],
        deck: [{ card: "BT1-013", as: "top" }],
      },
    });
    const pending = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("offmon"));
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await pending;
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });

  it("links for 1 and locks exactly one opposing Digimon from unsuspending", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: CARD_ID, as: "link" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "digimon" },
            { card: "BT1-089", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("digimon").permanentId);
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked[0]?.instanceId).toBe(s.inst("link").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("digimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("tamer"), "unsuspend")).toBe(false);
  });

  it("does not retrigger an already linked Offmon for a later link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host", linked: [CARD_ID] }],
          hand: [{ card: "BT26-010", as: "other" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("other").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("other").instanceId));
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });
});
