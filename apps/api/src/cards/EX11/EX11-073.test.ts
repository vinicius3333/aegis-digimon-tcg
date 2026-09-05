import { describe, expect, it } from "vitest";
import { EffectTiming, dnaDigivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-073.js";
import "./EX11-070.js";

describe("EX11-073 ExMaquinamon", () => {
  it("preserves the printed level 7 Digimon and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-073")).toMatchObject({
      nameEn: "ExMaquinamon",
      colors: ["Green", "Black"],
      level: 7,
      playCost: 15,
      dp: 15000,
      evoCosts: [
        { color: "Green", level: 6, memoryCost: 5 },
        { color: "Black", level: 6, memoryCost: 5 },
      ],
      types: ["Unique", "LIBERATOR"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.dnaDigivolveRequirement).toEqual([
      {
        cost: 0,
        materials: [
          { color: "Green", level: 6 },
          { color: "Black", level: 6 },
        ],
      },
    ]);
    expect(dnaDigivolutionRequirementsFor("EX11-073")).toEqual(compiled.dnaDigivolveRequirement);
  });

  it("DNA digivolves from one green Lv.6 and one black Lv.6 at cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-080", as: "green" },
          { card: "BT10-067", as: "black" },
        ],
        hand: [{ card: "EX11-073", as: "result" }],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("green").permanentId, s.perm("black").permanentId],
        instanceId: s.inst("result").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("result").topCard?.cardId).toBe("EX11-073");
    expect(s.perm("result").stack.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT1-080", "BT10-067"]));
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it.each([
    ["wrong colors", "BT1-080", "BT1-081"],
    ["wrong level", "BT1-080", "AD1-011"],
  ])("rejects DNA digivolution with %s", async (_label, first, second) => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: first, as: "first" },
          { card: second, as: "second" },
        ],
        hand: [{ card: "EX11-073", as: "result" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("first").permanentId, s.perm("second").permanentId],
        instanceId: s.inst("result").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX11-073");
  });

  it("has Security Attack +1 and Blocker while on the field", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX11-073", as: "exmaquinamon" }] } });
    await s.engine.recomputeContinuousEffects();
    await settle(() => observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "SecurityAttack"));
    expect(observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("exmaquinamon"), "Blocker")).toBe(true);
    expect(observe(s.engine).linkMaxDelta(s.perm("exmaquinamon"))).toBe(2);
    assertNoLoudGap(s);
  });

  it("links up to 3 exact Maquinamon from hand, trash, and only this Digimon's stack when DNA digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-073", as: "host", under: [{ card: "EX11-027", as: "ownStack" }] },
            { card: "EX11-028", as: "other", under: [{ card: "EX11-027", as: "otherStack" }] },
          ],
          hand: [{ card: "EX11-027", as: "handLink" }],
          trash: [{ card: "EX11-027", as: "trashLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("host"), {
      isDnaDigivolve: true,
    });

    expect(s.perm("host").linked.map(({ cardId }) => cardId)).toEqual(["EX11-027", "EX11-027", "EX11-027"]);
    expect(s.perm("other").stack.map(({ cardId }) => cardId)).toContain("EX11-027");
    assertNoLoudGap(s);
  });

  it("trashes material link cards immediately before the DNA merge (Q5945-Q5946)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-070", as: "unchained" },
            { card: "EX11-034", as: "first", linked: [{ card: "EX11-027", as: "materialLink" }] },
            { card: "BT10-067", as: "second" },
          ],
          hand: [{ card: "EX11-073", as: "result" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("unchained"));

    expect(s.perm("result").linked.map(({ instanceId }) => instanceId)).toEqual([s.inst("materialLink").instanceId]);
    expect(
      s.events.some(
        (event) =>
          (event as { kind?: string; to?: string; instanceIds?: string[] }).kind === "cardsMoved" &&
          (event as { to?: string }).to === "trash" &&
          (event as { instanceIds?: string[] }).instanceIds?.includes(s.inst("materialLink").instanceId),
      ),
    ).toBe(true);
    expect(s.perm("result").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX11-034", "BT10-067"]),
    );
    assertNoLoudGap(s);
  });

  it("processes all security trashes before all deck-bottom returns for each link card (Q5947)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX11-073",
              as: "host",
              linked: [{ card: "EX11-027" }, { card: "EX11-027" }],
            },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "firstTarget" },
            { card: "BT1-011", as: "secondTarget" },
            { card: "BT1-012", as: "thirdTarget" },
          ],
          security: ["BT1-013", "BT1-014", "BT1-015"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(2);
    const securityMove = s.events.findIndex((event) => {
      const move = event as { kind?: string; from?: string };
      return move.kind === "cardsMoved" && move.from === "security";
    });
    const deckMove = s.events.findIndex((event) => {
      const move = event as { kind?: string; to?: string };
      return move.kind === "cardsMoved" && move.to === "deckBottom";
    });
    expect(securityMove).toBeGreaterThanOrEqual(0);
    expect(deckMove).toBeGreaterThan(securityMove);
    assertNoLoudGap(s);
  });

  it("excludes ExMaquinamon itself from the [Maquinamon] link pool (exact name, KB Q1231/Q1232)", async () => {
    // "ExMaquinamon" CONTAINS "Maquinamon", so a substring name match would let this card link
    // copies of itself.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-073", as: "host" }],
          hand: [{ card: "EX11-073", as: "selfCopy" }],
          trash: [{ card: "EX11-073", as: "trashCopy" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("host"), {
      isDnaDigivolve: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX11-073");
    assertNoLoudGap(s);
  });

  it("links nothing when the digivolution is not a DNA digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-073", as: "host" }],
          hand: [{ card: "EX11-027", as: "handLink" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("host"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX11-027");
    assertNoLoudGap(s);
  });

  it("does nothing at the end of the opponent's turn with zero link cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX11-073", as: "host" }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "target" }],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with exact link sources and ordered per-link action groups", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")?.actions).toMatchObject([
      {
        kind: "Link",
        target: { source: "thisDigimon", count: 3, upTo: true },
        from: ["hand", "trash", "digivolutionCards"],
        condition: { kind: "isDnaDigivolving" },
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfOpponentsTurn")?.actions).toMatchObject([
      { kind: "RepeatPerCount", action: { kind: "trashSecurityTop" } },
      { kind: "RepeatPerCount", action: { kind: "Return", to: "deckBottom" } },
    ]);
  });
});
