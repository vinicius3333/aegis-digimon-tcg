import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX11-053.js";

describe("EX11-053 Omekamon", () => {
  it("preserves the printed card and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-053")).toMatchObject({
      nameEn: "Omekamon",
      colors: ["White"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [],
      types: ["Puppet", "X Antibody", "LIBERATOR"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

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
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-001")).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays Omnimon (X Antibody) at 1 security and places deleted Omekamon under it (Q5907)", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001"],
          hand: [{ card: "BT20-102", as: "omnimonX" }],
          battleArea: [{ card: "EX11-053", as: "omekamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("omekamon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-102"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT20-102");
    expect(played?.stack.some((card) => card.instanceId === s.inst("omekamon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("omekamon").instanceId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("keeps Omnimon (X Antibody) in hand above the printed security threshold", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001", "BT1-002"],
          hand: [{ card: "BT20-102", as: "omnimonX" }],
          battleArea: [{ card: "EX11-053", as: "omekamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("omekamon").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("omnimonX").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("can also play Omnimon (X Antibody) from under King Drasil", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001"],
          battleArea: [
            { card: "EX11-053", as: "omekamon" },
            { card: "BT23-072", as: "drasil", under: [{ card: "BT20-102", as: "omnimonX" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("omekamon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-102"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT20-102");
    expect(played?.stack.some((card) => card.instanceId === s.inst("omekamon").instanceId)).toBe(true);
    expect(s.perm("drasil").stack.some((card) => card.instanceId === s.inst("omnimonX").instanceId)).toBe(false);
    assertNoLoudGap(s);
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
                  or: expect.arrayContaining([
                    { zone: "hand" },
                    expect.objectContaining({
                      zone: "digivolutionCards",
                      hostFilter: expect.objectContaining({
                        nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "name" }],
                      }),
                    }),
                  ]),
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

  it("is also treated as X Antibody while on the field", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-053", as: "omekamon" }] } });
    await s.ready();
    expect(observe(s.engine).effectiveNames(s.perm("omekamon"))).toEqual(
      expect.arrayContaining(["omekamon", "x antibody"]),
    );
    assertNoLoudGap(s);
  });
});
