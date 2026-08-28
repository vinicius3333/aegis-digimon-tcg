import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT13-062.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-062 Chuumon", () => {
  it("gates the On Play processing condition before paying its hand cost", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          to: "hand",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ match: "name", tokens: ["Sukamon", "Etemon"] }],
              },
              count: 1,
            },
          },
          target: {
            filter: { zone: "trash", controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }] },
            count: 1,
          },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        expect.objectContaining({
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          suspended: true,
          optional: true,
          condition: expect.objectContaining({ kind: "selfHasNameContaining", names: ["Sukamon", "Etemon"] }),
          target: expect.objectContaining({
            count: 1,
            filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Chuumon"] }] },
          }),
        }),
      ],
    });
  });

  it("acceptance moves the selected hand-cost and trash-return instances", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-062", as: "chuu" },
            { card: "BT11-040", as: "cost" },
            { card: "BT11-040", as: "costOther" },
          ],
          trash: [
            { card: "BT11-040", as: "returned" },
            { card: "BT11-040", as: "returnedOther" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.inst("returned").instanceId);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("chuu").instanceId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("chuu").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("costOther").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("returned").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("returnedOther").instanceId)).toBe(true);
  });

  it("declining the optional processing condition moves neither exact instance", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT13-062", as: "chuu" },
            { card: "BT11-040", as: "cost" },
            { card: "BT11-040", as: "costOther" },
          ],
          trash: [
            { card: "BT11-040", as: "returned" },
            { card: "BT11-040", as: "returnedOther" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("chuu").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("chuu").instanceId));

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("returned").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("costOther").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("returnedOther").instanceId)).toBe(true);
  });

  it("offers the deleted exact Chuumon source, excludes near-name ChuuChuumon, and plays the selected instance suspended", async () => {
    const exact = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT11-040",
              as: "sukamon",
              under: [{ card: "BT13-062", as: "source" }],
            },
          ],
          trash: [
            { card: "BT3-061", as: "otherExact" },
            { card: "BT12-060", as: "near" },
          ],
        },
      },
    );
    await exact.ready();
    const sourceId = exact.inst("source").instanceId;
    const otherExactId = exact.inst("otherExact").instanceId;
    const nearId = exact.inst("near").instanceId;
    const deletion = advance(exact.engine).verb.deletePermanent([exact.perm("sukamon").permanentId]);
    await settle(() => exact.decisions.some(({ req }) => req.kind === "optional"));
    const optional = exact.decisions.find(({ req }) => req.kind === "optional")!.req;
    expect(
      exact.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => exact.decisions.some(({ req }) => req.kind === "selectCards"));
    const selection = exact.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    if (selection.kind !== "selectCards") throw new Error("expected Chuumon selection");
    const offered = selection.options?.candidateInstanceIds ?? [];
    expect(offered).toEqual(expect.arrayContaining([sourceId, otherExactId]));
    expect(offered).not.toContain(nearId);
    expect(
      exact.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: selection.decisionId,
        response: { kind: "selectCards", instanceIds: [sourceId] },
      }),
    ).toEqual({ ok: true });

    await deletion;
    await settle(() => exact.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === sourceId));
    const played = exact.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === sourceId)!;
    expect(played.isSuspended).toBe(true);
    expect(exact.state.players[0]!.trash.some(({ instanceId }) => instanceId === sourceId)).toBe(false);
    expect(exact.state.players[0]!.trash.some(({ instanceId }) => instanceId === otherExactId)).toBe(true);
    expect(exact.state.players[0]!.trash.some(({ instanceId }) => instanceId === nearId)).toBe(true);
  });
});
