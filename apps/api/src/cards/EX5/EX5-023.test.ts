import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-023.js";
import "../index.js";

describe("EX5-023 WereGarurumon (X Antibody)", () => {
  it("trashes two hand cards to unsuspend and conditionally returns a Garurumon/X Antibody from trash", () => {
    const digivolvingAction = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[0];
    expect(digivolvingAction).toMatchObject({
      kind: "Unsuspend",
      abortOnDecline: true,
      cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 2 } },
    });
    expect(digivolvingAction).not.toHaveProperty("optional");
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions?.[1]).toMatchObject({
      kind: "Return",
      to: "hand",
      optional: true,
      target: {
        filter: {
          nameOrTrait: [{ match: "name", tokens: ["Garurumon", "X Antibody"] }],
        },
      },
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { match: "nameExact", tokens: ["WereGarurumon"] },
            { match: "nameExact", tokens: ["X Antibody"] },
          ],
        },
      },
    });
  });
  it("can trash one hand card to unsuspend when attacking under the name condition", () => {
    const attackingAction = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0];
    expect(attackingAction).toMatchObject({
      kind: "Unsuspend",
      condition: { kind: "selfHasNameContaining", names: ["Garurumon", "Omnimon"] },
      cost: { kind: "trash", target: { filter: { zone: "hand" }, count: 1 } },
    });
    expect(attackingAction).not.toHaveProperty("optional");
  });

  it("returns a card only for an exact WereGarurumon or X Antibody stack name", async () => {
    const resolve = async (stackCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT1-009", as: "base", under: [stackCard], suspended: true }],
            hand: [{ card: "EX5-023", as: "evolving" }, "BT1-009", "BT1-009"],
            trash: [{ card: "BT1-036", as: "target" }],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).verb.digivolveFromInstance(s.perm("base").permanentId, s.inst("evolving").instanceId, {
        payCost: false,
        draw: false,
        ignoreRequirements: true,
      });
      await settle(() => s.perm("base").topCard?.cardId === "EX5-023" && s.state.players[0]!.hand.length !== 2);
      return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("target").instanceId);
    };

    expect(await resolve("BT1-040")).toBe(true);
    expect(await resolve("BT5-029")).toBe(false);
    expect(await resolve("BT13-063")).toBe(false);
  });

  it("digivolves publicly, trashes two hand cards, unsuspends, and returns a matching card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-018", as: "base", under: ["BT1-040"], suspended: true }],
          hand: [{ card: "EX5-023", as: "evolving" }, "BT1-009", "BT1-010"],
          trash: [{ card: "BT1-036", as: "returnTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-023" && s.state.players[0]!.trash.length >= 2);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnTarget").instanceId)).toBe(true);
  });

  it("does not return a trash card when the stack has neither exact name", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-018", as: "base", under: ["BT5-029"], suspended: true }],
          hand: [{ card: "EX5-023", as: "evolving" }, "BT1-009", "BT1-010"],
          trash: [{ card: "BT1-036", as: "returnTarget" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-023");

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("returnTarget").instanceId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("returnTarget").instanceId);
  });

  it("unsuspends a matching inherited host by trashing one hand card once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-036", as: "host", under: ["EX5-023"], suspended: true }], hand: ["BT1-009"] },
    });
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-009")).toHaveLength(1);
  });
});
