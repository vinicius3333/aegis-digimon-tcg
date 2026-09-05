import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./EX9-017.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-017", () => {
  it("has Training and trashes 1 opposing digivolution card by placing a card from hand face-down underneath on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 1,
      scope: "acrossDigimon",
      scaling: { unit: "selfFaceDownDigivolutionCards", per: 1 },
      cost: { kind: "place", destination: "digivolutionStack", faceDown: true },
    });
  });
  it("inherits Jamming", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Jamming",
      raw: "＜Jamming＞",
    }));

  it("trashes across opposing Digimon once per face-down source and ignores face-up sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-017",
              as: "source",
              under: [
                { card: "EX9-070", faceUp: false },
                { card: "EX9-071", faceUp: true },
              ],
            },
          ],
          hand: ["EX9-072"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target-a", under: ["EX9-070"] },
            { card: "BT1-010", as: "target-b", under: ["EX9-071"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("target-a").stack).toHaveLength(0);
    expect(s.perm("target-b").stack).toHaveLength(0);
    expect(s.perm("source").stack).toHaveLength(3);
    expect(s.perm("source").stack.filter((card) => card.faceUp !== true)).toHaveLength(2);
  });

  it("inherits Jamming through a legal EX9-014 to EX9-017 to neutral host stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-014", as: "base" }],
        hand: [
          { card: "EX9-017", as: "source" },
          { card: "BT1-038", as: "host" },
        ],
      },
      1: { security: ["BT1-021"] },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX9-017");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-038");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX9-014", "EX9-017"]);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
