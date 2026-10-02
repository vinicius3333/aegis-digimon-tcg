import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-101.js";

describe("BT8-101 Plasma Shot", () => {
  it("waives its yellow requirement and combines the selected and trash-scaled DP reductions", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-012", as: "armor" }],
          hand: [{ card: "BT8-101", as: "option" }],
          trash: ["BT8-023", "BT8-039"],
        },
        1: {
          battleArea: [
            { card: "BT8-053", as: "chosen", dp: 10_000 },
            { card: "BT8-012", as: "other", dp: 10_000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("chosen").currentDP === 4_000 &&
        s.perm("other").currentDP === 8_000 &&
        s.state.players[0]!.trash.some((card) => card.cardId === "BT8-101"),
    );

    expect(s.perm("chosen").currentDP).toBe(4_000);
    expect(s.perm("other").currentDP).toBe(8_000);
    expect(s.decisions.filter(({ req }) => req.kind === "chooseTargets")).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT8-101")).toBe(true);
  });

  it("activates the same combined reductions from security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT8-101", as: "option", faceUp: true }],
          trash: ["BT8-023", "BT8-039"],
        },
        1: {
          battleArea: [
            { card: "BT8-053", as: "chosen", dp: 10_000 },
            { card: "BT8-012", as: "other", dp: 10_000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.perm("chosen").currentDP === 4_000 && s.perm("other").currentDP === 8_000);

    expect(s.perm("chosen").currentDP).toBe(4_000);
    expect(s.perm("other").currentDP).toBe(8_000);
  });

  it("applies its trash-scaled DP reduction to a Digimon played later in the turn (Discord 1555352172206493706)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-012", as: "armor" }],
          hand: [{ card: "BT8-101", as: "option" }],
          trash: ["BT8-023", "BT8-039"],
        },
        1: {
          battleArea: [
            { card: "BT8-053", as: "chosen", dp: 10_000 },
            { card: "BT8-012", as: "other", dp: 10_000 },
          ],
          hand: [{ card: "BT1-019", as: "future" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("other").currentDP === 8_000);

    await advance(s.engine).verb.playInstances([s.inst("future").instanceId]);

    expect(s.perm("future").currentDP).toBe(4_000);
  });
});

describe("BT8-101 Plasma Shot — KB Q&A rulings", () => {
  it("gives the chosen Digimon -4000 DP and then an additional -1000 DP for 1 [Armor Form] card in trash (Q1781)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-012", as: "armor" }],
          hand: [{ card: "BT8-101", as: "option" }],
          trash: ["BT8-023", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT8-053", as: "chosen", dp: 10_000 },
            { card: "BT8-012", as: "other", dp: 10_000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT8-101"));
    await settle(() => s.perm("chosen").currentDP === 5_000 && s.perm("other").currentDP === 9_000);

    expect(s.perm("chosen").currentDP).toBe(5_000);
    expect(s.perm("other").currentDP).toBe(9_000);
  });
});
