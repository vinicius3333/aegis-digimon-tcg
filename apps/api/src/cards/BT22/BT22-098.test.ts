import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-098.js";

describe("BT22-098 Unique Emblem: Fable Waltz", () => {
  it.each(["hand", "trash"] as const)("offers only exact Shoemon and Arisa names from %s", async (zone) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT22-098", as: "emblem" }],
          battleArea: ["BT22-029"],
          [zone]: [
            ...(zone === "hand" ? [{ card: "BT22-098", as: "emblem" }] : []),
            { card: "BT22-029", as: "shoemon" },
            { card: "EX7-024", as: "otherShoemon" },
            { card: "BT22-088", as: "arisa" },
            { card: "BT22-032", as: "shoeShoemon" },
            { card: "ST19-08", as: "otherShoeShoemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true },
    );
    const emblemId = s.inst("emblem").instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const { candidateInstanceIds: candidates } = JSON.parse(decision.payloadJson) as { candidateInstanceIds: string[] };
    expect(candidates).toEqual(
      expect.arrayContaining([
        s.inst("shoemon").instanceId,
        s.inst("otherShoemon").instanceId,
        s.inst("arisa").instanceId,
      ]),
    );
    expect(candidates).toHaveLength(3);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("arisa").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === emblemId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("arisa").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]![zone].some((c) => c.instanceId === s.inst("shoeShoemon").instanceId)).toBe(true);
  });

  it("requires both Puppet and LIBERATOR traits for the Delay digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const watcher = effect?.actions[0] as any;
    const digivolve = watcher.actions[0];

    expect(effect?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(digivolve).toMatchObject({ kind: "Digivolve", reduceCost: 3, payCost: true, optional: true });
    expect(digivolve.into.and).toEqual([
      { nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
      { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
    ]);
  });

  it("places itself after the optional Main play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions).toMatchObject([
      { kind: "PlayWithoutCost", optional: true },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect((effect?.actions[1] as any).optional).toBeUndefined();
  });

  it("activates its Main effects from Security", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(effect).toMatchObject({ isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });

  it("plays Shoemon and places the same Option through its public Main resolution", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-098", as: "emblem" },
            { card: "BT22-029", as: "shoemon" },
          ],
          battleArea: ["BT22-029"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const emblemId = s.inst("emblem").instanceId;
    const shoemonId = s.inst("shoemon").instanceId;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: emblemId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === emblemId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shoemonId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === emblemId)).toBe(true);
  });

  it("activates Delay from a public Arisa suspension and evolves a legal Puppet/LIBERATOR stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-098", as: "emblem" },
            { card: "BT22-088", as: "arisa" },
            { card: "BT22-032", as: "base" },
          ],
          hand: [{ card: "BT22-036", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    s.perm("emblem").enterFieldTurnCount = s.state.turnCount - 1;
    s.perm("emblem").placedByEffect = true;

    await advance(s.engine).verb.suspend([s.perm("arisa").permanentId]);
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("evolution").instanceId);

    expect(s.perm("base").topCard?.cardId).toBe("BT22-036");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("emblem").instanceId)).toBe(true);
  });
});
