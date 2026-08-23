import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_092 } from "./BT24-092.js";
import "../index.js";

describe("BT24-092 Shock Plasma", () => {
  it("reduces an opponent Digimon and optionally links to your Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-092", as: "option" }],
          battleArea: [
            { card: "BT24-009", as: "ts" },
            { card: "BT24-009", as: "host" },
          ],
        },
        1: { battleArea: [{ card: "BT1-045", as: "opponent", dp: 13000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const option = s.inst("option");
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: option.instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 7000);

    expect(s.perm("opponent").currentDP).toBe(7000);
    const link = BT24_092.effects?.find((entry) => entry.trigger === "Main")?.actions?.[1];
    expect(link).toMatchObject({
      kind: "Link",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      recipient: {
        filter: { controller: "mine", kind: ["Digimon"] },
        orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }],
        count: 1,
      },
      allowBreedingRecipient: true,
      payCost: false,
      optional: true,
    });
    expect(BT24_092.linkRequirement).toEqual([{ traits: ["TS"], cost: 3 }]);
  });

  it("waives color from a breeding TS Digimon and links to it", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT24-009", as: "breedingTs" },
          hand: [{ card: "BT24-092", as: "option" }],
        },
        1: { battleArea: [{ card: "BT1-045", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.breeding!.linked.some((card) => card.instanceId === s.inst("option").instanceId),
    );
    expect(s.perm("opponent").currentDP).toBe(1000);
  });

  it("applies its linked -6000 DP effect on the host's first attack only", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-009", as: "host", linked: ["BT24-092"] }] },
      1: { battleArea: [{ card: "BT1-045", as: "opponent", dp: 13000 }] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("opponent").currentDP).toBe(7000);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("opponent").currentDP).toBe(7000);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT24-092", as: "option" }],
          battleArea: [{ card: "BT24-009", as: "host" }],
        },
        1: { battleArea: [{ card: "BT1-045", as: "opponent", dp: 7000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("option"));
    await settle(() => s.perm("opponent").currentDP === 1000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });
});
