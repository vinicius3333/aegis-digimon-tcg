import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-019.js";
import "./EX2-021.js";
import "./EX2-072.js";

describe("EX2-072 Blue Card", () => {
  it("reveals five and adds a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-060", "EX2-046"],
          hand: [{ card: "EX2-072", as: "option" }],
          deck: [{ card: "EX2-019", as: "digimon" }, "BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digimon").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("digimon").instanceId)).toBe(true);
  });

  it("may digivolve a compatible Digimon into a revealed non-white Digimon without paying its cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-019", as: "renamon" },
            { card: "EX2-060", as: "rika" },
            { card: "EX2-046", as: "whiteSource" },
          ],
          hand: [{ card: "EX2-072", as: "blueCard" }],
          deck: [
            { card: "EX2-021", as: "kyubimon" },
            "EX2-066",
            "EX2-067",
            "EX2-068",
            "EX2-069",
            { card: "BT1-001", as: "bonusDraw" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 10;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("blueCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("renamon").topCard.instanceId === s.inst("kyubimon").instanceId);

    expect(s.perm("renamon").topCard.cardId).toBe("EX2-021");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    // Blue Card pays 3 and the revealed digivolution is free. After its [Main]
    // effect finishes, Renamon is now an evolution source, so its inherited
    // "used an Option with cost 2+" effect gains 1 memory (Q3305/Q3363).
    expect(s.state.memory).toBe(memoryBefore - 2);
    // Kyubimon's [When Digivolving] waits until Blue Card returns the remaining
    // reveals, then adds the available Plug-In from that rebuilt deck (Q3364).
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX2-066");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX2-067", "EX2-068", "EX2-069"]),
    );
  });

  it("does not waive the white color requirement without a Tamer", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-014"], hand: [{ card: "EX2-072", as: "option" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("waives the white color requirement with a Tamer even when no white card is in play", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-014", "EX2-060"], hand: [{ card: "EX2-072", as: "option" }] } });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("may decline the compatible digivolution and then adds a revealed Digimon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX2-019", "EX2-060"],
          hand: [{ card: "EX2-072", as: "option" }],
          deck: [{ card: "EX2-021", as: "revealedDigimon" }, "EX2-014", "EX2-015", "EX2-031", "EX2-032"],
        },
      },
      { autoOrderCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const digivolveDecision = s.decisions.find(({ req }) => req.kind === "selectCards");
    expect(digivolveDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digivolveDecision!.req.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.filter(({ req }) => req.kind === "selectCards").length >= 2);
    const fallbackDecision = s.decisions.filter(({ req }) => req.kind === "selectCards").at(-1);
    expect(fallbackDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: fallbackDecision!.req.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("revealedDigimon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedDigimon").instanceId),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("revealedDigimon").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["EX2-014", "EX2-015", "EX2-031", "EX2-032"]);
  });

  it("plays a Tamer from hand without cost when activated from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX2-072", as: "securityOption", faceUp: true }],
          hand: [{ card: "EX2-060", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
    ).toBe(true);
  });
});
