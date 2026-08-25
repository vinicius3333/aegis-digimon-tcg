import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-053.js";

describe("EX11-053 Omekamon", () => {
  it("places a Royal Knight under King Drasil", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT23-072", as: "drasil" },
          hand: [{ card: "EX11-053", as: "omekamon" }, "AD1-008"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omekamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding?.stack.some((card) => card.cardId === "AD1-008") === true, 600);
    expect(s.state.players[0]!.breeding?.stack.some((card) => card.cardId === "AD1-008")).toBe(true);
  });

  it("plays Omnimon (X Antibody) at 1 security and places deleted Omekamon under it (Q5907)", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001"],
          hand: [{ card: "BT10-086", as: "omnimonX" }],
          battleArea: [{ card: "EX11-053", as: "omekamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives.deletePermanent([s.perm("omekamon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT10-086"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT10-086");
    expect(played?.stack.some((card) => card.instanceId === s.inst("omekamon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("omekamon").instanceId)).toBe(false);
  });

  it("keeps Omnimon (X Antibody) in hand above the printed security threshold", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001", "BT1-002"],
          hand: [{ card: "BT10-086", as: "omnimonX" }],
          battleArea: [{ card: "EX11-053", as: "omekamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives.deletePermanent([s.perm("omekamon").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("omnimonX").instanceId)).toBe(true);
  });

  it("publishes full compiled coverage, exact host narrowing, and the X Antibody rule name", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnDeletion",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "PlayWithoutCost",
              target: expect.objectContaining({
                filter: expect.objectContaining({
                  hostFilter: expect.objectContaining({
                    nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "name" }],
                  }),
                }),
              }),
            }),
          ]),
        }),
        expect.objectContaining({
          trigger: "Rule",
          actions: [{ kind: "GrantStatic", grant: "name", tokens: ["X Antibody"], target: expect.any(Object) }],
        }),
      ]),
    );
  });
});
