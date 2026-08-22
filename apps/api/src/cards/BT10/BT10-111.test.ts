import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-111.js";

describe("BT10-111 Shoutmon (King Version)", () => {
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
