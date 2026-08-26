import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT14-018.js";

const AMON = "TOKEN-Amon-of-Crimson-Flame";
const UMON = "TOKEN-Umon-of-Blue-Thunder";

describe("BT14-018", () => {
  it("preserves Goldramon's stats and exact entry/replacement IR", () => {
    expect(getCardDefinition("BT14-018")).toMatchObject({
      nameEn: "Goldramon",
      colors: ["Red", "Yellow"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Red", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      attributes: ["Vaccine"],
      types: ["Holy Dragon", "Four Great Dragons"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"])
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions[0]).toMatchObject({
        kind: "PlayToken",
        tokens: [
          { name: "Amon of Crimson Flame", keywords: [{ keyword: "Rush" }] },
          { name: "Umon of Blue Thunder", keywords: [{ keyword: "Blocker" }] },
        ],
        count: 1,
        payCost: false,
      });
    for (const event of ["wouldLeavePlay", "wouldDigivolve"])
      expect(
        compiled.effects
          .find((effect) => effect.trigger === "AllTurns")
          ?.actions.find((action) => action.kind === "Replacement" && action.event === event),
      ).toMatchObject({
        kind: "Replacement",
        mode: "instead",
        sourceFilter: { isSelfRef: true },
        actions: [
          { kind: "Delete", target: { count: "all" } },
          { kind: "Recover", amount: 1, condition: { kind: "ifThisEffectActed" } },
        ],
      });
  });

  it("Q2385/Q2386 plays the two exact level-less, no-cost keyword tokens on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT14-018", as: "source" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === UMON));
    const amon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === AMON)!;
    const umon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === UMON)!;
    expect(getCardDefinition(AMON)).toMatchObject({ nameEn: "Amon of Crimson Flame", dp: 6000, playCost: -1 });
    expect(getCardDefinition(AMON)!.level).toBeUndefined();
    expect(getCardDefinition(UMON)).toMatchObject({ nameEn: "Umon of Blue Thunder", dp: 6000, playCost: -1 });
    expect(getCardDefinition(UMON)!.level).toBeUndefined();
    expect(observe(s.engine).hasKeyword(amon, "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(umon, "Blocker")).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays both tokens on a real evolution from a red level 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-015", as: "base" }],
        hand: [{ card: "BT14-018", as: "goldramon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("goldramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === UMON));
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard.cardId).toBe("BT14-018");
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "BT14-018" && event.timing === "WhenDigivolving",
      ),
    ).toHaveLength(1);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => [AMON, UMON].includes(permanent.topCard?.cardId ?? "")),
    ).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("Q2387/Q2388 deletes every token and recovers exactly once before Goldramon leaves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-018", as: "goldramon" },
          { card: AMON, as: "amon" },
          { card: UMON, as: "umon" },
        ],
        deck: ["BT1-001", "BT1-001"],
        security: ["BT1-085"],
      },
    });
    await advance(s.engine).recompute();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("goldramon").permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("Q2389 also runs the token deletion and recovery before a non-deletion leave", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-018", as: "goldramon" },
          { card: UMON, as: "umon" },
        ],
        deck: ["BT1-001", "BT1-001"],
        security: ["BT1-085"],
      },
    });
    await advance(s.engine).recompute();
    await advance(s.engine).verb.returnToHand([s.perm("goldramon").topCard.instanceId]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-018")).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("deletes tokens and recovers before Goldramon completes a digivolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-018", as: "goldramon" },
          { card: AMON, as: "amon" },
        ],
        hand: [{ card: "BT13-112", as: "omnimon" }],
        deck: ["BT1-001", "BT1-001"],
        security: ["BT1-085"],
      },
    });
    s.state.memory = 10;
    await advance(s.engine).recompute();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goldramon").permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("goldramon").topCard.cardId === "BT13-112");
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === AMON)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("Q2612 lets Goldramon X gain and activate this card's When Digivolving effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-018", as: "goldramon" }],
          hand: [{ card: "BT16-014", as: "goldramonX" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("goldramon").permanentId,
        instanceId: s.inst("goldramonX").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === AMON) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === UMON),
    );
    expect(s.perm("goldramon").topCard.cardId).toBe("BT16-014");
    expect(s.state.memory).toBe(8);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => [AMON, UMON].includes(permanent.topCard?.cardId ?? "")),
    ).toHaveLength(2);
    expect(
      s.events.filter(
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "BT14-018" && event.timing === "WhenDigivolving",
      ),
    ).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("does not recover when no token is deleted or when a token is deleted by another effect", async () => {
    const noToken = setupEngine({
      0: { battleArea: [{ card: "BT14-018", as: "goldramon" }], deck: ["BT1-001"], security: ["BT1-085"] },
    });
    await advance(noToken.engine).recompute();
    expect(
      await advance(noToken.engine).verb.deletePermanent([noToken.perm("goldramon").permanentId], "byEffect"),
    ).toBe(1);
    expect(noToken.state.players[0]!.security).toHaveLength(1);

    const unrelated = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-018", as: "goldramon" },
          { card: AMON, as: "amon" },
        ],
        deck: ["BT1-001"],
        security: ["BT1-085"],
      },
    });
    await advance(unrelated.engine).recompute();
    expect(await advance(unrelated.engine).verb.deletePermanent([unrelated.perm("amon").permanentId], "byEffect")).toBe(
      1,
    );
    expect(unrelated.state.players[0]!.security).toHaveLength(1);
    assertNoLoudGap(noToken);
    assertNoLoudGap(unrelated);
  });
});
