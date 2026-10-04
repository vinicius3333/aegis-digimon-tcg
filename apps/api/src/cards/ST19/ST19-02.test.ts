import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-02.js";

describe("ST19-02 Junkmon inherited ＜Barrier＞", () => {
  it("uses the catalogued Junkmon Puppet identity", () => {
    expect(getCardDefinition("ST19-02")).toMatchObject({
      nameEn: "Junkmon",
      types: ["Puppet"],
      effectText: expect.stringContaining("Decoy ([Puppet] trait)"),
      inheritedEffectText: "＜Barrier＞.",
    });
  });

  it("can prevent two battle deletions in the same turn (Discord bug 1556063217623629944)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-023", as: "first" },
          { card: "BT1-023", as: "second" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-051", as: "barrier", suspended: true, under: ["ST19-02"] }],
        security: ["BT1-085", "BT1-085"],
      },
    });
    await s.ready();
    const defenderId = s.perm("barrier").permanentId;
    const turnCount = s.state.turnCount;
    for (const [index, alias] of ["first", "second"].entries()) {
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "permanent", permanentId: defenderId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.filter(({ kind }) => kind === "barrierPrompt").length > index);
      expect(s.engine.applyIntent(1, { type: "respondBarrier", permanentId: defenderId, accept: true })).toEqual({
        ok: true,
      });
      await settle(() => !observe(s.engine).isAttacking());
    }
    expect(s.state.turnCount).toBe(turnCount);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.events.filter(({ kind }) => kind === "barrierPrompt")).toHaveLength(2);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-085", "BT1-085"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("uses Decoy to sacrifice its host and preserve another Puppet from an effect deletion", async () => {
    const s = setupEngine(
      {
        0: {},
        1: {
          battleArea: [
            { card: "ST19-02", as: "decoy", dp: 7000 },
            { card: "ST19-04", as: "puppet", dp: 1000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const driver = advance(s.engine);
    driver.verb.enterEffectResolution(0, ["Digimon"]);
    await driver.verb.deletePermanent([s.perm("puppet").permanentId], "byEffect");
    driver.verb.leaveEffectResolution();
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.topCard.cardId !== "ST19-02"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST19-04")).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST19-02")).toBe(true);
  });
});
