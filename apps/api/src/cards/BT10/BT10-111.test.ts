import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-111.js";
import { cite } from "../../engine/conformance/_kb.js";

const DIGIXROS_RULE_SHA = "1ebbe9afb14fc39b5aee3c498e606dd9178970b2425fd882f84777cdfac157ae";
const DIGIXROS_RULES_CONTINUATION_SHA = "b69edb2cf7ad45544307bbc8650afb7eaa424284b67933c8bb3a4a73c0c4e973";

function citeDigiXrosSubstitute(): void {
  cite(
    "comprehensive-0117",
    "§7-2: DigiXros materials and substitution are resolved through the public play procedure.",
    DIGIXROS_RULE_SHA,
  );
  cite(
    "comprehensive-0118",
    "§7-2 continuation: a substituted requirement remains part of the declared DigiXros material set.",
    DIGIXROS_RULES_CONTINUATION_SHA,
  );
}

describe("BT10-111 Shoutmon (King Version)", () => {
  it("registers one Xros Heart DigiXros material for a two-memory reduction", () => {
    const requirement = [{ materials: [{ traits: ["Xros Heart"] }], count: 2 }];
    expect(compiled.digiXrosRequirement).toEqual(requirement);
    expect(digiXrosRequirementFor("BT10-111")).toEqual(requirement);
  });

  it("does not invent a Security effect absent from the catalog", () => {
    expect(compiled.effects.some((effect) => effect.trigger === "Security")).toBe(false);
  });

  it("limits DigiXros substitution to the current turn", () => {
    const substitution = compiled.effects
      .find((effect) => effect.trigger === "OnPlay")
      ?.actions.find((action) => action.kind === "GainKeyword");
    expect(substitution).toMatchObject({ kind: "GainKeyword", duration: "forTheTurn" });
  });

  it("Material Saves one matching Xros Heart material under a Tamer when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-087", as: "taiki" },
            { card: "BT10-111", as: "king", under: ["BT10-049"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("king"), "MaterialSave")).toBe(true);
    await advance(s.engine).verb.deletePermanent([s.perm("king").permanentId], "byEffect");
    await settle(() => s.perm("taiki").stack.some((card) => card.cardId === "BT10-049"));

    expect(s.perm("taiki").stack.some((card) => card.cardId === "BT10-049")).toBe(true);
  });

  it("returns only a card with a DigiXros requirement from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-111", as: "kingVersion" }],
          trash: [
            { card: "BT1-009", as: "ordinaryDigimon" },
            { card: "BT10-024", as: "digixrosCard" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const digiXrosCardId = s.inst("digixrosCard").instanceId;
    const ordinaryDigimonId = s.inst("ordinaryDigimon").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kingVersion").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((card) => card.instanceId === digiXrosCardId));

    expect(player.hand.map((card) => card.instanceId)).toContain(digiXrosCardId);
    expect(player.trash.map((card) => card.instanceId)).toContain(ordinaryDigimonId);
  });

  it("requires returning a DigiXros card when an eligible card exists", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-111", as: "kingVersion" }],
        trash: [{ card: "BT10-024", as: "digixrosCard" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("kingVersion").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const pending = s.state.pendingDecision!;

    expect(JSON.parse(pending.payloadJson) as { min: number }).toMatchObject({ min: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("digixrosCard").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digixrosCard").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digixrosCard").instanceId)).toBe(true);
  });

  it("replaces exactly one DigiXros requirement for the turn", async () => {
    citeDigiXrosSubstitute();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-021", as: "mailbirdramon" }],
          hand: [{ card: "BT10-111", as: "kingVersion" }],
          trash: [{ card: "BT10-024", as: "metalGreymon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kingVersion").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId));
    const kingPermanent = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("kingVersion").instanceId,
    )!;
    await settle(() => observe(s.engine).hasKeyword(kingPermanent, "DigiXrosSubstitute"));

    const memoryBeforeDigiXros = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [kingPermanent.topCard.instanceId, s.perm("mailbirdramon").topCard.instanceId],
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-024"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-024")!;
    expect(played.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT10-111", "BT10-021"]));
    expect(s.state.memory).toBe(memoryBeforeDigiXros - 3);
    expect(played.stack.map((card) => card.instanceId)).toContain(s.inst("kingVersion").instanceId);
    expect(played.stack.map((card) => card.instanceId)).toContain(s.inst("mailbirdramon").instanceId);
  });

  it("expires the substitute at a natural turn boundary before moving or paying DigiXros materials", async () => {
    citeDigiXrosSubstitute();
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-021", as: "mailbirdramon" }],
          hand: [{ card: "BT10-111", as: "kingVersion" }],
          trash: [{ card: "BT10-024", as: "metalGreymon" }],
          deck: ["BT1-010", "BT1-048", "BT1-009", "BT1-010"],
        },
        1: { deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kingVersion").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId),
      );
      const king = s.state.players[0]!.battleArea.find(
        (permanent) => permanent.topCard.instanceId === s.inst("kingVersion").instanceId,
      )!;
      const kingId = king.topCard.instanceId;
      const hostId = s.perm("mailbirdramon").topCard.instanceId;
      expect(observe(s.engine).hasKeyword(king, "DigiXrosSubstitute")).toBe(true);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(observe(s.engine).hasKeyword(king, "DigiXrosSubstitute")).toBe(false);
      const memoryBefore = s.state.memory;

      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("metalGreymon").instanceId,
          digiXros: { materialInstanceIds: [kingId, hostId] },
        }),
      ).toEqual({ ok: false, reason: "invalid-material" });
      expect(s.state.memory).toBe(memoryBefore);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("metalGreymon").instanceId);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === kingId)).toBe(true);
      expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === hostId)).toBe(true);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });

  it("cannot be added as an extra material when every DigiXros requirement is already satisfied", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-019", as: "greymon" },
            { card: "BT10-021", as: "mailbirdramon" },
          ],
          hand: [{ card: "BT10-111", as: "kingVersion" }],
          trash: [{ card: "BT10-024", as: "metalGreymon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("kingVersion").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId));
    const king = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("kingVersion").instanceId,
    )!;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("metalGreymon").instanceId,
        digiXros: {
          materialInstanceIds: [
            s.perm("greymon").topCard.instanceId,
            s.perm("mailbirdramon").topCard.instanceId,
            king.topCard.instanceId,
          ],
        },
      }),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });
});
