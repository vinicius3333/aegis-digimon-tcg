import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-048.js";
import "../BT5/BT5-092.js";
import "./P-098.js";
import "./P-129.js";

describe("P-098 Seadramon", () => {
  it("protects exactly the chosen blue Digimon from battle deletion through the opponent's turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", dp: 3000, suspended: true, as: "protected" }],
          hand: [{ card: "P-098", as: "seadramon" }],
        },
        1: { battleArea: [{ card: "BT1-025", dp: 11000, as: "attacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("seadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("seadramon").instanceId,
      ),
    );

    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: protectedId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("applies the same battle protection from its When Digivolving timing", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-029", as: "base" },
            { card: "BT1-027", dp: 3000, suspended: true, as: "protected" },
          ],
          hand: [{ card: "P-098", as: "seadramon" }],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-025", dp: 11000, as: "attacker" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("seadramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("seadramon").instanceId);

    s.state.turnSeat = 1;
    const protectedId = s.perm("protected").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: protectedId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === protectedId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("Q4184 grants Rush from a public effect-play, only once per turn, then resets naturally", async () => {
    expect(getCardDefinition("P-098")).toMatchObject({
      cardId: "P-098",
      nameEn: "Seadramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
    });

    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-040",
              as: "host",
              under: [{ card: "P-098", as: "source" }],
            },
            { card: "BT1-028", as: "firstRecipient" },
            { card: "BT1-028", as: "secondRecipient" },
          ],
          hand: [
            { card: "P-129", as: "firstTk" },
            { card: "P-129", as: "secondTk" },
            { card: "P-129", as: "thirdTk" },
            { card: "BT1-048", as: "firstPatamon" },
            { card: "BT1-048", as: "secondPatamon" },
            { card: "BT1-048", as: "thirdPatamon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-101"),
        },
        1: {
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: Array.from({ length: 20 }, () => "BT1-101"),
          security: [],
        },
      },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        preferOptionIndex: 0,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("firstRecipient").permanentId);
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("firstTk").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("firstPatamon").instanceId,
        ) && s.state.pendingDecision === undefined,
    );
    const firstRecipient = s.perm("firstRecipient");
    const firstPatamon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("firstPatamon").instanceId,
    )!;
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(firstPatamon).toBeDefined();
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("firstTk").instanceId)).toBe(false);
    expect(observe(s.engine).hasKeyword(firstRecipient, "Rush")).toBe(true);

    preferred.unshift(s.perm("secondRecipient").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("secondTk").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("secondPatamon").instanceId,
        ) && s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("secondTk").instanceId)).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("secondRecipient"), "Rush")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(firstRecipient, "Rush")).toBe(false);
    preferred.splice(0, preferred.length, s.perm("secondRecipient").permanentId);
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thirdTk").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard.instanceId === s.inst("thirdPatamon").instanceId,
        ) && s.state.pendingDecision === undefined,
    );
    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("thirdPatamon").instanceId,
      ),
    ).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(observe(s.engine).hasKeyword(s.perm("secondRecipient"), "Rush")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("thirdTk").instanceId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("Q4184 does not react to an ordinary hand play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-038", as: "host", under: ["P-098"] }],
        hand: [{ card: "BT1-029", as: "manualGabumon" }],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("manualGabumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("manualGabumon").instanceId,
      ),
    );
    await settle(() => false, 30);
    const manualGabumon = s.state.players[0]!.battleArea.find(
      (permanent) => permanent.topCard.instanceId === s.inst("manualGabumon").instanceId,
    )!;

    expect(observe(s.engine).hasKeyword(manualGabumon, "Rush")).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "P-098")).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
