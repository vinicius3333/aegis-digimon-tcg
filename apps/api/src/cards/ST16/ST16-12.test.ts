import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./ST16-12.js";

describe("ST16-12 MetalGarurumon", () => {
  it("exposes Blast Digivolve from hand at Counter timing", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("gains 1 memory for each card actually trashed by its digivolution cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-11", as: "weregarurumon" }],
          hand: [
            { card: "ST16-12", as: "metalgarurumon" },
            { card: "BT1-001", as: "costOne" },
            { card: "BT1-002", as: "costTwo" },
          ],
          deck: [{ card: "BT1-003" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("weregarurumon").permanentId,
        instanceId: s.inst("metalgarurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 2);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("costOne").instanceId, s.inst("costTwo").instanceId]),
    );
    expect(s.state.memory).toBe(9);
  });

  it("trashes one hand card and deletes the opponent's lowest-level Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-12", as: "metalgarurumon" }],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: {
          battleArea: [
            { card: "ST16-08", as: "lowest", suspended: true },
            { card: "ST16-11", as: "higher", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metalgarurumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("higher").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "ST16-08"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === costId)).toBe(true);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["ST16-11"]);
  });
});
