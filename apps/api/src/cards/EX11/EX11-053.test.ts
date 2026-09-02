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

  // Once Omekamon lands under the played Omnimon (X Antibody), BT20-102's own deferred
  // [On Play] sees [X Antibody] in its digivolution cards (exactly what Q5907 asserts) and
  // deletes every OTHER Digimon — here King Drasil. `preferred` makes the survivor choice the
  // played Omnimon so the assertions below observe Omekamon's placement rather than the
  // collateral. Without it, the harness keeps the first candidate (King Drasil) and deletes
  // the very Digimon this case exists to observe.
  it("can also play Omnimon (X Antibody) from under King Drasil", async () => {
    const preferred: string[] = [];
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
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("omnimonX").instanceId);
    await advance(s.engine).verb.deletePermanent([s.perm("omekamon").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("omnimonX").instanceId,
      ),
    );

    // The played permanent carries the exact instance that sat under King Drasil, so the card
    // came out of that stack rather than from a second copy.
    const played = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("omnimonX").instanceId,
    );
    expect(played).toBeDefined();
    expect(played?.stack.some((card) => card.instanceId === s.inst("omekamon").instanceId)).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) =>
          permanent.permanentId !== played?.permanentId &&
          permanent.stack.some((card) => card.instanceId === s.inst("omnimonX").instanceId),
      ),
    ).toBe(false);
    assertNoLoudGap(s);
  });

  it("leaves Omnimon (X Antibody) under a host that is not King Drasil_7D6", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-001"],
          battleArea: [
            { card: "EX11-053", as: "omekamon" },
            { card: "BT1-010", as: "notDrasil", under: [{ card: "BT20-102", as: "omnimonX" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("omekamon").permanentId], "byEffect");
    await settle(() => false, 60);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT20-102")).toBe(false);
    expect(s.perm("notDrasil").stack.some((card) => card.instanceId === s.inst("omnimonX").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("keeps the mandatory placement out of the optional prompts", () => {
    const onDeletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion");
    expect(onDeletion?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true });
    expect(onDeletion?.actions[1]).toMatchObject({ kind: "PlaceUnder", position: "bottom" });
    expect((onDeletion!.actions[1] as { optional?: boolean }).optional).toBeUndefined();
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
                        nameOrTrait: [{ tokens: ["King Drasil_7D6"], match: "nameExact" }],
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
