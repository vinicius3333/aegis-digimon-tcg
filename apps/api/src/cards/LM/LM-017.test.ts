import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-017.js";

describe("LM-017 Regulusmon", () => {
  it("trashes a hand card and places a Gammamon-text trash card under itself, bottom-most", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "LM-017", as: "regulusmon" },
            { card: "BT1-001", as: "cost" },
          ],
          trash: ["LM-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("regulusmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.some((perm) => perm.stack.some((card) => card.cardId === "LM-016")),
      2000,
    );

    const host = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "LM-017")!;
    expect(host.stack.map((card) => card.cardId)).toEqual(["LM-016"]);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });

  it("places the trash card beneath an existing digivolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-017", as: "regulusmon", under: ["BT1-024"] }],
          hand: [{ card: "BT1-001", as: "cost" }],
          trash: ["LM-016"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("regulusmon"));
    await settle(() => s.perm("regulusmon").stack.length === 2, 2000);

    expect(s.perm("regulusmon").stack.map((card) => card.cardId)).toEqual(["LM-016", "BT1-024"]);
  });

  it("deletes a level 4 or lower Digimon to play one from trash after gaining a source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-017", as: "regulusmon" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          trash: [{ card: "LM-016", as: "revive" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("regulusmon").permanentId,
      addedDigivolutionCardInstanceIds: [],
      byEffectSeat: 0,
    });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-016"),
      2000,
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-016")).toBe(true);
  });

  it("can delete an opposing level-4-or-lower Digimon to pay the source-add reaction", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-017", as: "regulusmon" }],
          trash: ["LM-016"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentCost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponentCost").permanentId);
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("regulusmon").permanentId,
      addedDigivolutionCardInstanceIds: [],
      byEffectSeat: 0,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "LM-016")).toBe(true);
  });

  it("does not react when an ordinary digivolution-card addition has no effect provenance", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-017", as: "regulusmon" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          trash: [{ card: "LM-016", as: "revive" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("regulusmon").permanentId,
      addedDigivolutionCardInstanceIds: [],
    });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "LM-016")).toBe(true);
  });

  it("spends the source-add reaction only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-017", as: "regulusmon" },
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          trash: ["LM-016", "BT10-078"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("regulusmon").permanentId,
      addedDigivolutionCardInstanceIds: [],
      byEffectSeat: 0,
    });
    await settle(() => s.state.players[0]!.trash.length === 1, 2000);
    const afterFirst = s.state.players[0]!.battleArea.length;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: s.perm("regulusmon").permanentId,
      addedDigivolutionCardInstanceIds: [],
      byEffectSeat: 0,
    });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.battleArea).toHaveLength(afterFirst);
  });

  it("registers the Blast Digivolve keyword marker", () => {
    const compiled = runtimeCompiledCard("LM-017")!;
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-017");
    const compiled = runtimeCompiledCard("LM-017");
    expect(definition?.nameEn).toBe("Regulusmon");
    expect(definition?.isAce).toBe(true);
    expect(definition?.overflowMemory).toBe(3);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });
});
