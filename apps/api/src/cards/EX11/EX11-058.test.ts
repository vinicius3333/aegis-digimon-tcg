import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-058.js";
import "./EX11-018.js";
import "./EX11-050.js";

describe("EX11-058 Yao Qinglan", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-058")).toMatchObject({
      nameEn: "Yao Qinglan",
      colors: ["Blue"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("places an Aqua or Sea Animal card under a matching Digimon and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "host" },
            { card: "EX11-058", as: "yao" },
          ],
          hand: ["BT23-023"],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("host").stack.some((card) => card.cardId === "BT23-023")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  // No card carries a bare [Aqua] trait; the printed "in any of its traits" reaches [Aquatic],
  // [Aquabeast] and [Ancient Aquabeast] (CR 2-3-2-4). An exact-trait filter matched none of
  // them, so the whole Aqua half of this Tamer was inert.
  it("places an [Aquatic] card under an [Aquatic] Digimon (CR 2-3-2-4)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-024", as: "aquaticHost" },
            { card: "EX11-058", as: "yao" },
          ],
          hand: [{ card: "BT2-024", as: "aquaticPayment" }],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("aquaticHost").stack.some((card) => card.instanceId === s.inst("aquaticPayment").instanceId)).toBe(
      true,
    );
    expect(s.perm("aquaticHost").stack[0]?.instanceId).toBe(s.inst("aquaticPayment").instanceId);
    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not accept a [Sea Beast] card, which contains neither bracketed trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-024", as: "aquaticHost" },
            { card: "EX11-058", as: "yao" },
          ],
          hand: [{ card: "ST2-02", as: "seaBeast" }],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("seaBeast").instanceId)).toBe(true);
    expect(s.perm("aquaticHost").stack).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("refuses a level 6 [Aquatic] card as the placement payment", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-008", as: "host" },
            { card: "EX11-058", as: "yao" },
          ],
          hand: [{ card: "BT10-027", as: "tooHigh" }],
          deck: ["BT1-009", "BT1-013"],
        },
        1: { deck: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("suspends to draw when an [Aquatic] Digimon is played, and not for a [Sea Beast] one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-058", as: "yao" }],
          hand: [
            { card: "BT2-024", as: "aquatic" },
            { card: "ST2-02", as: "seaBeast" },
          ],
          deck: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("seaBeast").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("seaBeast").instanceId),
    );
    expect(s.perm("yao").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.length).toBe(handBefore - 1);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquatic").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("yao").isSuspended);
    expect(s.perm("yao").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore - 1);
    assertNoLoudGap(s);
  });

  it("suspends to draw when an Aqua or Sea Animal Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-058", as: "yao" }],
          hand: [{ card: "BT14-008", as: "gizamon" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gizamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("yao").isSuspended);

    expect(s.perm("yao").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    assertNoLoudGap(s);
  });

  it("leaves Yao unsuspended and draws nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-058", as: "yao" }],
          hand: [{ card: "BT14-008", as: "gizamon" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gizamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 30);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("yao").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.length).toBe(handBefore - 1);
    assertNoLoudGap(s);
  });

  it("locks an opponent Digimon only when the triggering play carries Decode provenance (Q5911-Q5912)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-058", as: "yao" }],
          hand: [{ card: "BT14-008", as: "decoded" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("decoded").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("yao").isSuspended);
    expect(observe(s.engine).isRestricted(s.perm("target"), "beSuspended")).toBe(false);
    assertNoLoudGap(s);
  });

  it("locks an opponent Digimon after a public Decode replacement play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-058", as: "yao" },
            { card: "EX11-018", as: "decodeHost", dp: 1000, under: [{ card: "BT14-008", as: "decoded" }] },
          ],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "target" }],
          hand: [{ card: "EX11-050", as: "loudmon" }, "BT1-009", "BT1-013"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    await s.ready();
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("loudmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.length === 2);
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("decoded").instanceId),
    );
    expect(s.perm("decodeHost").topCard.cardId).toBe("EX11-018");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT14-008")).toBe(true);
    // The public Decode producer reaches the replacement play and its nested whenPlayed
    // watcher resolves in the same combined entry window.
    expect(s.perm("yao").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "beSuspended")).toBe(true);
    assertNoLoudGap(s);
  });

  it("draws on a later public digivolution without applying Decode restriction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-058", as: "yao" },
            { card: "BT1-030", as: "base" },
          ],
          hand: [{ card: "BT1-033", as: "evolution" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-033" && s.perm("yao").isSuspended);
    expect(s.perm("yao").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "beSuspended")).toBe(false);
    assertNoLoudGap(s);
  });

  it("publishes full IR with Aqua-or-Sea-Animal filters and Decode only on the play watcher", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const watchers = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions ?? [];
    const played = watchers.find((action) => action.kind === "SubTrigger" && action.event === "whenPlayed");
    const evolved = watchers.find(
      (action) => action.kind === "SubTrigger" && action.event === "whenOneOfYoursDigivolves",
    );
    expect(played).toMatchObject({
      sourceFilter: {
        nameOrTrait: [
          { tokens: ["Aqua"], match: "traitContains" },
          { tokens: ["Sea Animal"], match: "traitContains", orPrevious: true },
        ],
      },
      actions: [
        { kind: "Draw", cost: { kind: "suspend" }, abortOnDecline: true },
        { kind: "Restrict", condition: { kind: "triggerPlayedByDecode" } },
      ],
    });
    expect(evolved).toMatchObject({ actions: [{ kind: "Draw" }] });
    // The digivolve watcher never carries the Decode clause (Q5912).
    expect((evolved as { actions: { kind: string }[] }).actions.some(({ kind }) => kind === "Restrict")).toBe(false);
    // "1 level 5 or lower CARD": the placement payment is not narrowed to Digimon.
    const placeCost = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions[0] as {
      cost?: { target?: { filter?: { kind?: string[]; nameOrTrait?: { match: string }[] } } };
    };
    expect(placeCost.cost?.target?.filter?.kind).toBeUndefined();
    expect(placeCost.cost?.target?.filter?.nameOrTrait?.every(({ match }) => match === "traitContains")).toBe(true);
  });
});
