import { type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-089.js";

describe("BT4-089 Plutomon", () => {
  it("draws two then uses a purple Option costing 6 or less for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-085", as: "base", under: ["BT4-081"] }],
          hand: [
            { card: "BT4-089", as: "evolving" },
            { card: "BT4-111", as: "option" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const optionId = s.inst("option").instanceId;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.trash.some(({ instanceId }) => instanceId === optionId));

    expect(player.trash.some(({ instanceId }) => instanceId === optionId)).toBe(true);
    expect(player.deck).toHaveLength(0);
    expect(s.state.memory).toBe(0);
  });

  it("does not use a non-purple Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-085", as: "base", under: ["BT4-081"] }],
          hand: [
            { card: "BT4-089", as: "evolving" },
            { card: "BT4-098", as: "redOption" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => player.deck.length === 0);

    expect(player.hand.some(({ instanceId }) => instanceId === s.inst("redOption").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(0);
  });
});

it("#4964 mechanism sweep: Plutomon never offers a purple Option from the opponent's hand", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT4-085", as: "base" }],
        hand: [
          { card: "BT4-089", as: "pluto" },
          { card: "ST6-15", as: "own" },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { hand: [{ card: "ST6-15", as: "opponent" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 10;
  const ownId = s.inst("own").instanceId;
  const opponentId = s.inst("opponent").instanceId;
  await s.ready();
  expect(
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("pluto").instanceId,
    }),
  ).toEqual({ ok: true });
  await settle(
    () => s.state.players[0]!.trash.some((c) => c.instanceId === ownId) && s.state.pendingDecision === undefined,
  );
  const offered = s.decisions
    .filter((d) => d.req.sourceCardId === "BT4-089" && d.req.kind === "selectCards")
    .flatMap((d) => d.req.options?.candidateInstanceIds ?? []);
  expect(offered).not.toContain(opponentId);
  expect(s.state.players[1]!.hand.some((c) => c.instanceId === opponentId)).toBe(true);
});
