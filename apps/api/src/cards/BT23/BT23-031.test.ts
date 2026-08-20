import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-031.js";

describe("BT23-031 Angewomon", () => {
  it("pays 3 less with LadyDevimon and recovers deck top even from zero security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-067", as: "ladyDevimon" }],
        hand: [{ card: "BT23-031", as: "angewomon" }],
        deck: [{ card: "BT23-100", as: "recovered" }],
      },
    });
    s.state.memory = 10;
    const angewomonId = s.inst("angewomon").instanceId;
    const recoveredId = s.inst("recovered").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: angewomonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === recoveredId));

    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: recoveredId });
  });

  it("grants inherited Alliance to its carrier", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-035", as: "carrier", under: ["BT23-031"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("carrier"), "Alliance")).toBe(true);
  });

  it("reduces its play cost when you have LadyDevimon or Mirei Mikagura", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 3,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["LadyDevimon", "Mirei Mikagura"], match: "name" }],
            },
          },
        },
      ],
    });
  });

  it("adds the top security card to hand, then recovers if three or fewer remain", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "toHand",
        controller: "mine",
        amount: 1,
        toTop: true,
      });
      expect(actions[1]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      });
    }
  });

  it("declares inherited Alliance", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Alliance" }],
    });
  });
});
