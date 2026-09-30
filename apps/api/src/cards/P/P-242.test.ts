import type { PlayerState, Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./P-242.js";

async function driveTurn(s: ReturnType<typeof setupEngine>, seat: Seat): Promise<void> {
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  for (let i = 0; i < 600 && !mainPhase.isOpen; i++) await Promise.resolve();
  s.engine.applyIntent(seat, { type: "endPhase" });
  await turn;
}

const LIFE_TRAIT_CARD = "BT24-038";

describe("P-242 [Start of Your Main Phase] trash Life/System/Transmutation card from hand, draw 1 + gain 1 memory", () => {
  it("links an eligible trash card to a friendly Digimon with a one-memory reduction after suspending", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "Link",
          from: ["trash"],
          costDelta: -1,
          payCost: true,
          recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          cost: { kind: "suspend", target: { isSelf: true, count: 1 } },
        },
      ],
    });
  });

  it("trashes a Life-trait card, draws 1, and gains 1 memory at the start of the main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-242", dp: 0, as: "reiTamer" }],
          hand: [{ card: LIFE_TRAIT_CARD, as: "lifeCard" }],
          deck: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const lifeCardId = s.inst("lifeCard").instanceId;

    s.state.isFirstPlayersFirstTurn = false;
    await driveTurn(s, 0);

    expect(p0.trash.some((c) => c.instanceId === lifeCardId)).toBe(true);
  });

  it("does NOT fire when there is no Life/System/Transmutation card in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-242", dp: 0, as: "reiTamer" }],
          hand: [{ card: "BT1-009", as: "plain" }],
          deck: Array.from({ length: 5 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const plainId = s.inst("plain").instanceId;

    s.state.isFirstPlayersFirstTurn = false;
    await driveTurn(s, 0);

    expect(p0.hand.some((c) => c.instanceId === plainId)).toBe(true);
    expect(p0.trash.some((c) => c.instanceId === plainId)).toBe(false);
  });

  it("suspends itself and links an eligible Life card from trash to a Digimon at the reduced cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-242", as: "reiTamer" },
            { card: "BT21-009", as: "host" },
          ],
          trash: [{ card: LIFE_TRAIT_CARD, as: "lifeCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effect = (observe(s.engine).activatableEffects(s.perm("reiTamer")) as Array<{ effectKey?: string }>).find(
      (entry) => entry.effectKey === "P-242/main-suspend-link",
    ) as { effectKey: string } | undefined;
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("reiTamer").instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("reiTamer").isSuspended).toBe(true);
    expect(s.perm("host").linked.some((card) => card.instanceId === s.inst("lifeCard").instanceId)).toBe(true);
  });
});

describe("P-242 Rei Katsura — KB Q&A rulings", () => {
  async function linkWithRei(copies: 1 | 2) {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-242", as: "rei1" },
            ...(copies === 2 ? [{ card: "P-242", as: "rei2" }] : []),
            { card: "BT21-009", as: "host" },
          ],
          trash: [{ card: LIFE_TRAIT_CARD, as: "lifeCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effect = observe(s.engine)
      .activatableEffects(s.perm("rei1"))
      .find((entry) => entry.effectKey === "P-242/main-suspend-link")!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("rei1").instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("lifeCard").instanceId]);
    return s;
  }

  it("reduces the link cost by only 1 even with 2 copies in the battle area (Q6928)", async () => {
    const single = await linkWithRei(1);
    const double = await linkWithRei(2);

    expect(10 - single.state.memory).toBe(2);
    expect(10 - double.state.memory).toBe(2);
    expect(double.perm("rei1").isSuspended).toBe(true);
    expect(double.perm("rei2").isSuspended).toBe(false);
  });
});

describe("P-242 Rei Katsura — printed [Link] requirement of the linked card", () => {
  async function activateLink(hosts: Array<{ card: string; as: string }>) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-242", as: "rei" }, ...hosts],
          trash: [{ card: LIFE_TRAIT_CARD, as: "biomon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const effect = observe(s.engine)
      .activatableEffects(s.perm("rei"))
      .find((entry) => entry.effectKey === "P-242/main-suspend-link");
    if (effect !== undefined) {
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("rei").instanceId,
        effectKey: effect.effectKey,
      });
      await settle(() => s.state.pendingDecision === undefined);
    }
    return s;
  }

  const biomonIn = (s: ReturnType<typeof setupEngine>) =>
    s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("biomon").instanceId);

  it("does not link BT24-038 ([Link] [Appmon] trait) to a Digimon without the [Appmon] trait", async () => {
    const s = await activateLink([{ card: "BT1-009", as: "agumon" }]);

    expect(s.perm("agumon").linked.length).toBe(0);
    expect(biomonIn(s)).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("links BT24-038 only to the [Appmon] trait Digimon when both kinds are on the field", async () => {
    const s = await activateLink([
      { card: "BT1-009", as: "agumon" },
      { card: "BT21-009", as: "gatchmon" },
    ]);

    expect(s.perm("agumon").linked.length).toBe(0);
    expect(s.perm("gatchmon").linked.map((card) => card.instanceId)).toEqual([s.inst("biomon").instanceId]);
    expect(s.state.memory).toBe(8);
  });
});
