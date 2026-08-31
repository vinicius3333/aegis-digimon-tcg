import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-098.js";

describe("BT15-098", () => {
  it("requires an own-Digimon deletion before optionally playing Myotismon and placing itself", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: { kind: "deleteOwn" },
          actions: [{ kind: "PlayWithoutCost", from: ["trash"] }, { kind: "PlaceInBattleAreaSelf" }],
        },
      ],
    });
  });
  it("places itself when Myotismon is deleted, has Delay, and plays VenomMyotismon from trash", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "PlaceInBattleAreaSelf" }] }],
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Main",
      keywords: [{ keyword: "Delay" }],
      actions: [{ kind: "PlayWithoutCost", requiresDelayArmed: true }],
    });
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
    });
  });

  it("naturally deletes an own Digimon, optionally plays Myotismon from trash, and places itself", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-068", as: "source" },
            { card: "BT15-070", as: "sacrifice" },
          ],
          hand: [{ card: "BT15-098", as: "option" }],
          trash: [{ card: "BT15-076", as: "myotismon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId);
    s.state.memory = 10;
    await s.ready();
    const sacrificeId = s.perm("sacrifice").permanentId;
    const optionInstanceId = s.inst("option").instanceId;
    const myotismonInstanceId = s.inst("myotismon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId) &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === myotismonInstanceId),
    );

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === myotismonInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(true);
  });

  it("does not reach the Then placement when no own Digimon can pay the deletion gate", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-093", as: "purpleTamer" }],
          hand: [{ card: "BT15-098", as: "option" }],
          trash: [{ card: "BT15-076", as: "myotismon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionInstanceId = s.inst("option").instanceId;
    const myotismonInstanceId = s.inst("myotismon").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === myotismonInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === optionInstanceId)).toBe(false);
  });
});
