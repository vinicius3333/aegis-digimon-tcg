import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-075.js";

describe("BT22-075 Fakemon", () => {
  it("uses the official Sup. alternate route and rejects a non-Sup. off-color base", async () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, colors: ["Purple"], cost: 4, isAlternate: false },
      { level: 4, colors: ["Green"], cost: 4, isAlternate: false },
      { level: 4, traits: ["Sup."], cost: 4, isAlternate: true },
    ]);
    for (const [base, legal] of [["BT22-058", true], ["BT22-020", false]] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT22-075", as: "fakemon" }] },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("fakemon").instanceId,
          useAlternateCost: true,
        }).ok,
      ).toBe(legal);
    }
  });
  it("grants Scapegoat while linked", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-071", as: "host", linked: [{ card: "BT22-075", as: "fakemon" }] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Scapegoat")).toBe(true);
  });

  it("links only cards with Link requirements from trash or this stack", () => {
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "Link",
        from: ["trash", "digivolutionCards"],
        optional: true,
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            hasLinkRequirement: true,
          },
          count: 1,
          source: "thisDigimon",
        },
      });
    }
  });

  it("charges Link cost 3 and moves the Appmon card from hand onto Fakemon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT22-075", as: "fakemon" }], hand: [{ card: "BT22-035", as: "link" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("fakemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(0);
    expect(s.perm("fakemon").linked.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("plays one of this Digimon's linked cards on leave, once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["linked"],
              target: { filter: { isSelfRef: true, zone: "linked" }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("plays its physical link card free when Fakemon would be deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-075", as: "fakemon", linked: [{ card: "BT22-071", as: "linked" }] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const linkedId = s.inst("linked").instanceId;
    await s.ready();
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives.deletePermanent([s.perm("fakemon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === linkedId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === linkedId)).toBe(true);
  });

  it("plays its linked card through a public battle leave", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-075",
              as: "fakemon",
              dp: 1000,
              suspended: true,
              linked: [{ card: "BT22-071", as: "linked" }],
            },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const linkedId = s.inst("linked").instanceId;
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("fakemon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === linkedId));

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === linkedId)).toBe(true);
  });
});
