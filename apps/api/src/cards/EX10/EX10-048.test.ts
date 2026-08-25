import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-048.js";
import "../index.js";

const CARD_ID = "EX10-048";

describe("EX10-048 Myotismon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Purple", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Undead"],
    });
  });

  it("proves play-cost replacement, same-target On Play/On Deletion buffs, and deletion Tamer play", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          mode: "reduceCost",
          amount: 4,
          cost: { kind: "deleteOwn", raw: expect.any(String) },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Blocker" },
            target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] }, count: 1 },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Retaliation" },
            target: { sameTarget: true },
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects?.filter((effect) => effect.trigger === "OnDeletion")).toHaveLength(2);
    expect(
      compiled.effects?.find(
        (effect) => effect.trigger === "OnDeletion" && effect.actions?.[0]?.kind === "PlayWithoutCost",
      ),
    ).toMatchObject({
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          suspended: true,
          optional: true,
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Purple"] }, count: 1 },
        },
      ],
    });
  });

  it("Q5130 deletes a Myotismon-text Digimon to reduce the play cost by 4", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "myotismon" }],
          battleArea: [{ card: "EX10-047", as: "sacrifice" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId);
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("myotismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("sacrifice").instanceId);
  });

  it("On Play grants Blocker and Retaliation to the same selected purple Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "myotismon" },
            { card: "EX10-047", as: "target" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("plain").permanentId, s.perm("target").permanentId);
    await s.ready();
    const effect = compiled.effects!.find((entry) => entry.trigger === "OnPlay")!;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("myotismon"));
    expect(effect.actions).toHaveLength(2);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
  });

  it("the inherited On Deletion plays a purple Tamer from trash suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-053", as: "host", under: [{ card: CARD_ID, as: "myotismon" }] }],
          trash: [{ card: "EX10-065", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId),
    );
    const tamer = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === s.inst("tamer").instanceId,
    )!;
    expect(tamer.isSuspended).toBe(true);
  });
});
