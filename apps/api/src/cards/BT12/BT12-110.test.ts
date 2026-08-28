import { describe, expect, it } from "vitest";
import { EffectTiming, getCompiledCard } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-110.js";

describe("BT12-110 Seventh Full Cluster", () => {
  it("publishes trash, main, and security effects in declarative IR", () => {
    const compiled = getCompiledCard("BT12-110");
    expect(compiled?.effects.map(({ trigger }) => trigger)).toEqual(["YourTurn", "Main", "Security"]);
  });

  it("registers its printed Security activation", () => {
    const module = getEffectModule("BT12-110");
    const source = { instanceId: "source-110", cardId: "BT12-110", ownerSeat: 0, isOnBattleArea: () => false } as never;
    expect(module!.effectsForTiming(EffectTiming.SecuritySkill, source)).toHaveLength(1);
  });

  it("activates from trash when Beelzemon (X Antibody) digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-085", as: "beelzemon-x" }],
          trash: [{ card: "BT12-110", as: "cluster" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("beelzemon-x").permanentId,
    });

    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT12-110")).toBe(false);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT12-110")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-015"]);
  });

  it("deletes the opposing Digimon with the lowest level from Main", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT12-110", as: "cluster" }], battleArea: [{ card: "BT12-085", as: "purpleSource" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cluster").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-015"]);
  });

  it("activates the same lowest-level deletion from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT12-110", as: "cluster", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lowest" },
            { card: "BT1-015", as: "higher" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("cluster"));
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toEqual(["BT1-015"]);
  });
});
