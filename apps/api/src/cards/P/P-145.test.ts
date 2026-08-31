import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-145.js";

describe("P-145 Myotismon (X Antibody)", () => {
  it("plays a level-6 Myotismon from trash when deleted with Myotismon in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-145", as: "host", under: ["BT8-080"] }],
          trash: [{ card: "BT15-080", as: "level6" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("level6").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("level6").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("does not revive without Myotismon or X Antibody in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-145", as: "host", under: ["BT1-009"] }],
          trash: [{ card: "BT15-080", as: "level6" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("level6").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("deletes an opposing level 4 Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-145", as: "source" }] },
        1: { battleArea: [{ card: "BT1-033", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("encodes zero-cost Myotismon digivolution and conditional level-6 revival", () => {
    const compiled = runtimeCompiledCard("P-145")!;
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Myotismon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "Delete" })] }),
        expect.objectContaining({
          trigger: "OnDeletion",
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              from: ["trash"],
              optional: true,
              target: expect.objectContaining({ filter: expect.objectContaining({ levels: [6] }) }),
              condition: expect.objectContaining({
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  or: [
                    { nameOrTrait: [{ tokens: ["Myotismon"], match: "name" }] },
                    { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] },
                  ],
                },
              }),
            }),
          ],
        }),
      ]),
    );
  });

  it("revives with an X Antibody trait-only digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-145", as: "host", under: ["EX5-070"] }],
          trash: [{ card: "BT15-080", as: "level6" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("level6").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("level6").instanceId)).toBe(
      true,
    );
  });

  it("deletes an opposing level-4 Digimon on When Digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "P-145", as: "source" }] },
      1: { battleArea: [{ card: "BT1-033", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
