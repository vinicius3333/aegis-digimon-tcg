import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT10-021.js";

describe("BT10-021 MailBirdramon", () => {
  it("encodes mutually exclusive Kiriha branches, Save, and inherited dual restriction", () => {
    expect(compiled.effects).toEqual([
      expect.objectContaining({ trigger: "OnPlay", actions: expect.any(Array) }),
      expect.objectContaining({ trigger: "OnDeletion", keywords: [expect.objectContaining({ keyword: "Save" })] }),
      expect.objectContaining({
        trigger: "WhenAttacking",
        frequency: "OncePerTurn",
        isInherited: true,
        actions: [
          expect.objectContaining({ kind: "Restrict", restriction: "attack" }),
          expect.objectContaining({
            kind: "Restrict",
            restriction: "block",
            target: expect.objectContaining({ sameTarget: true }),
          }),
        ],
      }),
    ]);
    const onPlay = compiled.effects.find((effect) => effect.trigger === "OnPlay");
    expect(onPlay?.actions).toEqual([
      expect.objectContaining({
        condition: expect.objectContaining({ filter: expect.objectContaining({ zone: "battleArea" }) }),
      }),
      expect.objectContaining({
        condition: expect.objectContaining({ filter: expect.objectContaining({ zone: "battleArea" }) }),
      }),
    ]);
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking");
    const conditions = (attacking?.actions ?? []).map(
      (action) => (action.condition as { conditions?: Array<{ filter?: { zone?: string } }> } | undefined)?.conditions,
    );
    expect(conditions.every((nested) => nested?.[1]?.filter?.zone === "battleArea")).toBe(true);
  });

  it("plays Kiriha Aonuma from hand when none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT10-021", as: "source" },
            { card: "BT10-088", as: "kiriha" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !player.hand.some((c) => c.instanceId === s.inst("kiriha").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("kiriha").instanceId)).toBe(false);
    expect(player.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("kiriha").instanceId)).toBe(
      true,
    );
    expect(s.state.memory).toBe(0);
  });

  it("recovers an exact MetalGreymon when Kiriha Aonuma is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-088"],
          hand: [{ card: "BT10-021", as: "source" }],
          trash: [{ card: "BT10-024", as: "metalGreymon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("metalGreymon").instanceId));

    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not treat MetalGreymon (X Antibody) as the named MetalGreymon target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT10-088"],
          hand: [{ card: "BT10-021", as: "source" }],
          trash: [{ card: "BT9-015", as: "metalGreymonX" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("metalGreymonX").instanceId)).toBe(true);
  });

  it("restricts one opponent Digimon from attacking and blocking only with a Blue Flare host and 2 opponents", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-019", as: "attacker", under: ["BT10-021"] }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
          security: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => ["first", "second"].some((alias) => observe(s.engine).isRestricted(s.perm(alias), "attack")));

    const restricted = ["first", "second"].filter((alias) => observe(s.engine).isRestricted(s.perm(alias), "attack"));
    expect(restricted).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm(restricted[0]!), "block")).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    expect(["first", "second"].filter((alias) => observe(s.engine).isRestricted(s.perm(alias), "attack"))).toHaveLength(
      1,
    );
  });

  it("does not restrict an opponent when fewer than 2 Digimon are in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-019", as: "attacker", under: ["BT10-021"] }] },
        1: { battleArea: [{ card: "BT1-010", as: "onlyOpponent" }], security: ["BT1-012"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle();

    expect(observe(s.engine).isRestricted(s.perm("onlyOpponent"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("onlyOpponent"), "block")).toBe(false);
  });

  it("does not count a Digimon in the breeding area as being in play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-019", as: "attacker", under: ["BT10-021"] }] },
        1: {
          battleArea: [{ card: "BT1-010", as: "battleOpponent" }],
          breeding: { card: "BT1-011", as: "breedingOpponent" },
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle();

    expect(observe(s.engine).isRestricted(s.perm("battleOpponent"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("battleOpponent"), "block")).toBe(false);
  });

  it("may Save itself under a friendly Tamer on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT10-021", as: "mailBirdramon" },
            { card: "BT10-088", as: "kiriha" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("mailBirdramon").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("mailBirdramon").permanentId])).toBe(1);
    await settle(() => s.perm("kiriha").stack.some((card) => card.instanceId === sourceId));

    expect(s.perm("kiriha").stack.some((card) => card.instanceId === sourceId)).toBe(true);
  });
});
