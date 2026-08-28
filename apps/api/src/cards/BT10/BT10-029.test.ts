import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-029.js";

describe("BT10-029 Starmons", () => {
  it("encodes Save, conditional inherited Draw 1, and the alternate Xros Heart evolution", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OnDeletion",
        keywords: [expect.objectContaining({ keyword: "Save" })],
        actions: [
          expect.objectContaining({
            kind: "PlaceUnder",
            underFilter: { controller: "mine", kind: ["Tamer"] },
          }),
        ],
      }),
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        actions: [
          expect.objectContaining({
            kind: "Draw",
            amount: 1,
            condition: expect.objectContaining({ kind: "selfHasNameContaining" }),
          }),
        ],
      }),
    ]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Xros Heart"], cost: 0, isAlternate: true },
    ]);
  });

  it("draws when its Shoutmon-named host attacks, but not under another host", async () => {
    const matching = setupEngine({
      0: {
        battleArea: [{ card: "BT10-009", as: "host", under: ["BT10-029"] }],
        deck: [{ card: "BT1-001", as: "drawn" }],
      },
      1: { security: ["BT1-001"] },
    });
    expect(
      matching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: matching.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => matching.state.players[0]!.hand.length === 1);
    expect(matching.state.players[0]!.hand[0]!.instanceId).toBe(matching.inst("drawn").instanceId);

    const nonMatching = setupEngine({
      0: {
        battleArea: [{ card: "BT10-020", as: "host", under: ["BT10-029"] }],
        deck: [{ card: "BT1-001", as: "top" }],
      },
      1: { security: ["BT1-001"] },
    });
    expect(
      nonMatching.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: nonMatching.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => nonMatching.state.players[1]!.security.length === 0);
    expect(nonMatching.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(matching);
    assertNoLoudGap(nonMatching);
  });

  it("uses Save to place itself under the chosen Tamer after deletion", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-029", as: "starmons" },
            { card: "BT1-085", as: "chosenTamer" },
            { card: "BT1-085", as: "otherTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosenTamer").permanentId);
    const starmonsId = s.perm("starmons").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("starmons").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("chosenTamer").stack.some(({ instanceId }) => instanceId === starmonsId));

    expect(s.perm("otherTamer").stack.some(({ instanceId }) => instanceId === starmonsId)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === starmonsId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("allows declining Save so the deleted card remains in trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-029", as: "starmons" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: false },
    );
    const starmonsId = s.perm("starmons").topCard.instanceId;
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("starmons").permanentId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "confirm");

    const pending = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req).toMatchObject({ kind: "optional", sourceCardId: "BT10-029" });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(1);

    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === starmonsId)).toBe(true);
    expect(s.perm("tamer").stack.some(({ instanceId }) => instanceId === starmonsId)).toBe(false);
    assertNoLoudGap(s);
  });

  it("digivolves for 0 from an off-color level-2 Xros Heart card only", () => {
    const traitBase = setupEngine({
      0: {
        battleArea: [{ card: "BT10-005", as: "xrosHeartEgg" }],
        hand: [{ card: "BT10-029", as: "starmons" }],
      },
    });
    traitBase.state.memory = 0;
    expect(
      traitBase.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: traitBase.perm("xrosHeartEgg").permanentId,
        instanceId: traitBase.inst("starmons").instanceId,
      }),
    ).toEqual({ ok: true });
    expect(traitBase.state.memory).toBe(0);

    const plainBase = setupEngine({
      0: {
        battleArea: [{ card: "BT6-001", as: "plainEgg" }],
        hand: [{ card: "BT10-029", as: "starmons" }],
      },
    });
    plainBase.state.memory = 0;
    expect(
      plainBase.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: plainBase.perm("plainEgg").permanentId,
        instanceId: plainBase.inst("starmons").instanceId,
      }).ok,
    ).toBe(false);
    assertNoLoudGap(traitBase);
    assertNoLoudGap(plainBase);
  });

  it("also uses its standard yellow level-2 evolution route for 0", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-003", as: "yellowBase" }],
        hand: [{ card: "BT10-029", as: "starmons" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("starmons").instanceId,
      }),
    ).toEqual({ ok: true });
    expect(s.state.memory).toBe(0);
  });
});
