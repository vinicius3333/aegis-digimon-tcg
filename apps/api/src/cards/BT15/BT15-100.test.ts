import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-100.js";

describe("BT15-100", () => {
  it("deletes an opposing level 4 and level 6 Digimon, paying for the first by trashing a hand card", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "Delete", target: { filter: { levels: [4] } }, cost: { kind: "trash" } },
        { kind: "Delete", target: { filter: { levels: [6] } } },
      ],
    });
  });
  it("from trash reacts to a Leviamon X Antibody digivolution and returns itself to the bottom", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [{ kind: "Delete", cost: { kind: "return" } }, { kind: "Delete" }],
        },
      ],
    }));

  it("naturally trashes a hand card and deletes both required opposing levels from Main", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-068", as: "source" }],
          hand: [
            { card: "BT15-100", as: "option" },
            { card: "BT15-069", as: "cost" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT15-072", as: "level4" },
            { card: "BT15-079", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const level4Id = s.perm("level4").permanentId;
    const level6Id = s.perm("level6").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id) &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === level6Id),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level6Id)).toBe(false);
  });

  it("naturally resolves the Trash trigger on Leviamon (X Antibody) digivolution and returns itself to deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-077", as: "base" }],
          hand: [{ card: "BT15-081", as: "leviamon" }],
          trash: [{ card: "BT15-100", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT15-072", as: "level4" },
            { card: "BT15-079", as: "level6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const leviamonInstanceId = s.inst("leviamon").instanceId;
    const optionInstanceId = s.inst("option").instanceId;
    const level4Id = s.perm("level4").permanentId;
    const level6Id = s.perm("level6").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: leviamonInstanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.instanceId === leviamonInstanceId &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id) &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === level6Id),
    );

    expect(s.perm("base").topCard?.instanceId).toBe(leviamonInstanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionInstanceId)).toBe(false);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(optionInstanceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level4Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === level6Id)).toBe(false);
  });
});
