import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT25-090.js";
import "../index.js";

describe("BT25-090 Tomoro Tenma", () => {
  it("matches the catalog identity and no-evolution Tamer shape", () => {
    expect(getCardDefinition("BT25-090")).toMatchObject({
      cardId: "BT25-090",
      nameEn: "Tomoro Tenma",
      colors: ["Green"],
      kinds: ["Tamer"],
      types: ["Glowing Dawn", "BEATBREAK"],
      playCost: 4,
      evoCosts: [],
    });
  });

  it("keeps the Glowing Dawn reduction in the Your Turn window", () => {
    const reduction = compiled.effects.find((effect) =>
      effect.actions?.some((action) => action.kind === "Replacement" && action.event === "wouldBePlayed"),
    );
    expect(reduction?.trigger).toBe("YourTurn");
    expect(reduction?.frequency).toBe("OncePerTurn");
  });

  it("sets memory to 3 only when its controller starts the turn at 2 or less", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: "BT25-090", as: "tomoro" }] } });
    low.state.memory = 2;
    await low.ready();
    await advance(low.engine).fireForInstance(EffectTiming.OnStartTurn, low.perm("tomoro").topCard!);
    expect(low.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: "BT25-090", as: "tomoro" }] } });
    high.state.memory = 4;
    await high.ready();
    await advance(high.engine).fireForInstance(EffectTiming.OnStartTurn, high.perm("tomoro").topCard!);
    expect(high.state.memory).toBe(4);
  });

  it("on an own Digimon attack, suspends itself and places deck top one-by-one face down at true bottom (Q6424-Q6428)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-090", as: "tomoro", under: [{ card: "BT1-011", as: "existing", faceUp: false }] },
            { card: "BT1-009", as: "attacker" },
          ],
          deck: [
            { card: "BT1-010", as: "firstTop" },
            { card: "BT1-012", as: "secondTop" },
          ],
        },
        1: { security: [{ card: "BT1-013" }] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tomoro").stack.length === 3);

    expect(s.perm("tomoro").isSuspended).toBe(true);
    expect(s.perm("tomoro").stack.map((card) => card.instanceId)).toEqual([
      s.inst("secondTop").instanceId,
      s.inst("firstTop").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.perm("tomoro").stack.every((card) => card.faceUp === false)).toBe(true);
  });

  it("also triggers when the opponent's Digimon suspends, but refusal pays nothing", async () => {
    const accepted = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-090", as: "tomoro" }], deck: ["BT1-010", "BT1-011"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true },
    );
    accepted.state.turnSeat = 1;
    await accepted.ready();
    expect(
      accepted.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: accepted.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => accepted.perm("tomoro").stack.length === 2);
    expect(accepted.perm("tomoro").isSuspended).toBe(true);

    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-090", as: "tomoro" },
            { card: "BT1-009", as: "attacker" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[1]!.security.length === 0);
    expect(declined.perm("tomoro").isSuspended).toBe(false);
    expect(declined.perm("tomoro").stack).toHaveLength(0);
  });

  it("reduces a real Glowing Dawn Option use by 1 and trashes the bottom face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-236", as: "option" }],
          battleArea: [
            { card: "BT25-090", as: "tomoro" },
            {
              card: "BT25-091",
              as: "paymentTamer",
              under: [
                { card: "BT1-009", as: "cost", faceUp: false },
                { card: "BT1-010", as: "upper", faceUp: false },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.every((card) => card.instanceId !== s.inst("option").instanceId));
    expect(s.state.memory).toBe(0);
    expect(s.perm("paymentTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("upper").instanceId]);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("cost").instanceId, faceUp: true }),
    );
  });

  it("lets two physical copies accumulate -2 for one Option (Q6429)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-236", as: "option" }],
          battleArea: [
            { card: "BT25-090", as: "first", under: [{ card: "BT1-009", faceUp: false }] },
            { card: "BT25-090", as: "second", under: [{ card: "BT1-010", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
  });

  it("is once per turn per physical copy across two real Option uses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-236", as: "firstOption" },
            { card: "P-236", as: "secondOption" },
          ],
          battleArea: [
            {
              card: "BT25-090",
              as: "tomoro",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-010", faceUp: false },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const firstId = s.inst("firstOption").instanceId;
    const secondId = s.inst("secondOption").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: firstId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.every((card) => card.instanceId !== firstId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId, useAs: "option" } as never)).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.every((card) => card.instanceId !== secondId));
    expect(s.state.memory).toBe(5); // 3-1 for the first use, full 3 for the second.
    expect(s.perm("tomoro").stack).toHaveLength(1);
  });

  it("ignores a wrong-trait Option and cannot react during the opponent's turn", async () => {
    const wrong = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-095", as: "wrong" }],
          battleArea: [{ card: "BT25-090", as: "tomoro", under: [{ card: "BT1-009", faceUp: false }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    wrong.state.memory = 5;
    await wrong.ready();
    expect(
      wrong.engine.applyIntent(0, {
        type: "playCard",
        instanceId: wrong.inst("wrong").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => wrong.state.players[0]!.hand.length === 0);
    expect(wrong.state.memory).toBe(2);
    expect(wrong.perm("tomoro").stack).toHaveLength(1);

    const opposingTurn = setupEngine(
      {
        0: {
          hand: [{ card: "P-236", as: "option" }],
          battleArea: [{ card: "BT25-090", as: "tomoro", under: [{ card: "BT1-009", faceUp: false }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    opposingTurn.state.turnSeat = 1;
    opposingTurn.state.memory = 5;
    await opposingTurn.ready();
    expect(
      opposingTurn.engine.applyIntent(0, {
        type: "playCard",
        instanceId: opposingTurn.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(opposingTurn.perm("tomoro").stack).toHaveLength(1);
  });

  it("declining or lacking a face-down payment leaves the cost and stack unchanged", async () => {
    for (const faceUp of [false, true]) {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: "P-236", as: "option" }],
            battleArea: [{ card: "BT25-090", as: "tomoro", under: [{ card: "BT1-009", faceUp }] }],
          },
        },
        faceUp
          ? { autoAcceptOptional: true, autoSelectCards: true }
          : { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("option").instanceId,
          useAs: "option",
        } as never),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.hand.length === 0);
      expect(s.state.memory).toBe(0);
      expect(s.perm("tomoro").stack).toHaveLength(1);
    }
  });

  it("a real security check plays Tomoro without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT25-090", as: "tomoro" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();
    const tomoroId = s.inst("tomoro").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === tomoroId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === tomoroId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
