import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared/schema/enums";
import { advance } from "#api/engine/testkit/advance";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import "#api/cards/index";

describe("Ravemon discard and revival", () => {
  it.each([0, 7, 8, 9])("trashes down to seven or deletes when no card was trashed at %s", async (count) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-083", as: "raven" }], hand: [{ card: "BT27-083", as: "option" }] },
        1: { hand: Array(count).fill("BT1-009"), battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("option").instanceId));
    expect(s.state.players[1]!.hand).toHaveLength(Math.min(7, count));
    expect(s.state.players[1]!.battleArea).toHaveLength(count <= 7 ? 0 : 1);
  });

  it.each([
    [8, 1, "selectCards", "[Main] Your opponent trashes cards in their hand so that they have 7 left."],
    [5, 0, "chooseTargets", "If this effect didn't trash, delete 1 of their Digimon."],
  ])("highlights the resolving clause at %s opponent hand cards", async (count, seat, kind, emphasis) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-083", as: "raven" }], hand: [{ card: "BT27-083", as: "option" }] },
        1: { hand: Array(count).fill("BT1-009"), battleArea: [{ card: "BT1-009" }, { card: "BT1-010" }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("option").instanceId));
    expect(s.decisions.map(({ seat, req }) => [seat, req.kind, req.options?.effectTextEmphasis])).toEqual([
      [seat, kind, emphasis],
    ]);
  });

  it.each([7, 8])("revives a purple bird only at seven or fewer opponent hand cards (%s)", async (count) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-083", as: "raven" }], trash: ["BT27-078", "BT1-009"] },
        1: { hand: Array(count).fill("BT1-009") },
      },
      { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("raven").permanentId]);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(count === 7 ? ["BT27-078"] : []);
  });

  it("lets the opponent choose a security card without exposing its identity", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT27-083", as: "raven" }], hand: [{ card: "BT27-083", as: "option" }] },
        1: { security: ["BT1-009", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("raven"));
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
    const decision = s.decisions.find((d) => d.req.kind === "selectCards");
    expect(decision?.seat).toBe(1);
    expect(decision?.req.options?.visibleCards ?? []).toEqual([]);
  });
  it("uses Arts Digivolve over Crowmon without paying evolution memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-081", as: "base", under: ["BT27-078"] }],
          hand: [{ card: "BT27-083", as: "option" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT27-083");
    expect(s.perm("base").stack.map((c) => c.cardId)).toEqual(["BT27-078", "BT27-081"]);
    expect(s.state.memory).toBe(5);
  });

  it.each([
    ["EX13-026", { ok: true }],
    ["BT1-009", { ok: false, reason: "color-requirement-unmet" }],
  ])("meets its use requirement with %s in the breeding area", async (breedingCard, expected) => {
    const s = setupEngine(
      {
        0: { breeding: { card: breedingCard }, hand: [{ card: "BT27-083", as: "option" }] },
        1: { battleArea: [{ card: "BT1-009" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" }),
    ).toMatchObject(expected);
  });

  it("allows declining revival", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT27-083", as: "raven" }], trash: ["BT27-078"] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("raven").permanentId]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toContain("BT27-078");
  });
});

describe("official rulings", () => {
  it("counts as a DATA SQUAD Option card when another effect uses one", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT27-081", as: "crowmon" },
            {
              card: "BT1-085",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-011", faceUp: false },
              ],
            },
          ],
          hand: [{ card: "BT27-083", as: "option" }],
          deck: ["BT1-009"],
        },
        1: { hand: Array<string>(9).fill("BT1-009"), battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, declinePrompts: ["Arts Digivolve"] },
    );
    await s.ready();
    s.state.memory = 3;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("crowmon"));
    await settle(() => !s.state.pendingDecision);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(s.inst("option").instanceId);
    expect(s.state.players[1]!.hand).toHaveLength(7);
    expect(s.state.memory).toBe(3);
  });

  it.each([
    ["keyword/retaliation", ["retaliation", "revival"]],
    ["BT27-083/ir", ["revival", "retaliation"]],
  ])("lets the player resolve %s first when Retaliation and its revival trigger together", async (first, expected) => {
    const order: string[] = [];
    const record = (step: string, done: boolean) => {
      if (done && !order.includes(step)) order.push(step);
    };
    const s: ReturnType<typeof setupEngine> = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT27-083", as: "raven", suspended: true }],
          trash: [{ card: "BT27-078", as: "bird" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 13000 }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        declineDigiXros: true,
        declinePrompts: ["Arts Digivolve"],
        preferTriggerKeys: [first],
        onEvent: () => {
          record("retaliation", s.state.players[1]!.trash.length > 0);
          record(
            "revival",
            s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("bird").instanceId),
          );
        },
      },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("raven").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && order.length === 2 && !s.state.pendingDecision);
    const ordering = s.decisions.find((d) => d.req.kind === "orderTriggers");
    expect(ordering?.req.options?.triggerCardIds).toEqual(["BT27-083", "BT27-083"]);
    expect(order).toEqual(expected);
  });
});
