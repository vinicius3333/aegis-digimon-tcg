import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT3-109.js";

describe("BT3-109 Back for Revenge!", () => {
  it("matches official metadata and registers fully covered IR", () => {
    expect(getCardDefinition("BT3-109")).toMatchObject({
      nameEn: "Back for Revenge!",
      colors: ["Purple"],
      kinds: ["Option"],
      playCost: 2,
      effectText: expect.stringContaining("Any [On Play] effects"),
    });
    expect(compiled).toEqual(getCompiledCard("BT3-109"));
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("replays the deleted Digimon without activating its On Play effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-008", as: "target" }, "BT3-076"],
          hand: [{ card: "BT3-109", as: "option" }],
          deck: ["BT3-019", "BT3-016", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-109"));
    const deckSize = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT3-008"));
    expect(s.state.players[0]!.deck).toHaveLength(deckSize);
  });

  it("follows a later digivolution and leaves its sources in trash (Q1147/Q2730)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-076", as: "target" }],
          hand: [
            { card: "BT3-109", as: "option" },
            { card: "BT3-080", as: "evolved" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT3-109"));

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT3-080");
    await advance(s.engine).verb.deletePermanent([s.perm("target").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT3-080"));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT3-076")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT3-076")).toBe(false);
  });
});
