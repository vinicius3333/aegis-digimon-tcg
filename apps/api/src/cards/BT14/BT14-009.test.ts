import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-009.js";

describe("BT14-009", () => {
  it("restricts both players from playing Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      actions: [
        {
          kind: "RestrictPlay",
          seat: "any",
          mode: "play",
          byEffectOnly: true,
          filter: { kind: ["Digimon"] },
          duration: "permanent",
        },
      ],
    }));
});

it("allows ordinary Digimon play but blocks Digimon effect-play for both players and permits Tamers", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT14-009", as: "gotsumon" }],
      hand: [
        { card: "BT14-007", as: "ordinary" },
        { card: "BT14-008", as: "ownEffectDigimon" },
        { card: "BT1-085", as: "effectTamer" },
      ],
    },
    1: { hand: [{ card: "BT14-007", as: "opponentEffectDigimon" }] },
  });
  s.state.turnSeat = 0;
  s.state.memory = 10;
  await s.engine.recomputeContinuousEffects();

  expect(
    s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("ordinary").instanceId,
    }),
  ).toEqual({ ok: true });

  await advance(s.engine).verb.playInstances([s.inst("ownEffectDigimon").instanceId], "BT14-038");
  await advance(s.engine).verb.playInstances([s.inst("opponentEffectDigimon").instanceId], "BT14-038");
  await advance(s.engine).verb.playInstances([s.inst("effectTamer").instanceId], "BT14-038");

  expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ownEffectDigimon").instanceId)).toBe(true);
  expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("opponentEffectDigimon").instanceId)).toBe(
    true,
  );
  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-085")).toBe(true);
  assertNoLoudGap(s);
});

it("also blocks an effect-driven Digimon placement into the breeding area", async () => {
  const s = setupEngine({
    0: {
      battleArea: [{ card: "BT14-009", as: "gotsumon" }],
      hand: [{ card: "BT14-010", as: "effectDigimon" }],
    },
  });
  await s.ready();

  await advance(s.engine).verb.playInstances([s.inst("effectDigimon").instanceId], "BT14-038", { breeding: true });

  expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("effectDigimon").instanceId)).toBe(true);
  expect(s.state.players[0]!.breeding).toBeUndefined();
  assertNoLoudGap(s);
});

it("keeps the effect-play restriction on a legal Koromon-to-Gotsumon stack", async () => {
  const s = setupEngine({
    0: {
      breeding: { card: "BT14-001", as: "egg" },
      hand: [
        { card: "BT14-009", as: "gotsumon" },
        { card: "BT14-010", as: "effectDigimon" },
      ],
      deck: ["BT1-009"],
    },
  });
  s.state.memory = 5;

  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("gotsumon").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(() => s.perm("egg").topCard.cardId === "BT14-009");

  s.state.phase = Phase.Breeding;
  expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({
    ok: true,
  });
  await settle(() => !s.perm("egg").inBreeding);

  await advance(s.engine).verb.playInstances([s.inst("effectDigimon").instanceId], "BT14-038");

  expect(s.perm("egg").topCard.cardId).toBe("BT14-009");
  expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT14-001"]);
  expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("effectDigimon").instanceId)).toBe(true);
  assertNoLoudGap(s);
});

describe("BT14-009 Gotsumon — KB Q&A rulings", () => {
  it("still applies play cost reductions when a Digimon is played from hand, not by an effect (Q2374)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT14-009", as: "gotsumon" }],
        hand: [{ card: "BT4-115", as: "lucemon" }],
        trash: Array.from({ length: 10 }, () => "BT1-009"),
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lucemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("lucemon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("stops either player from playing a Digimon into the breeding area by an effect (Q5209)", async () => {
    const blocked = setupEngine({
      0: { hand: [{ card: "BT14-010", as: "effectDigimon" }] },
      1: { battleArea: [{ card: "BT14-009", as: "opponentGotsumon" }] },
    });
    await blocked.ready();

    await advance(blocked.engine).verb.playInstances([blocked.inst("effectDigimon").instanceId], "BT14-038", {
      breeding: true,
    });

    expect(blocked.state.players[0]!.breeding).toBeUndefined();
    expect(
      blocked.state.players[0]!.hand.some((card) => card.instanceId === blocked.inst("effectDigimon").instanceId),
    ).toBe(true);
    assertNoLoudGap(blocked);

    const withoutGotsumon = setupEngine({ 0: { hand: [{ card: "BT14-010", as: "effectDigimon" }] } });
    await withoutGotsumon.ready();

    await advance(withoutGotsumon.engine).verb.playInstances(
      [withoutGotsumon.inst("effectDigimon").instanceId],
      "BT14-038",
      { breeding: true },
    );

    expect(withoutGotsumon.state.players[0]!.breeding?.topCard.instanceId).toBe(
      withoutGotsumon.inst("effectDigimon").instanceId,
    );
  });
});
