import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-051.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-051 Gomimon", () => {
  it("encodes Detach and the Your Turn linked grant plus linked-face De-Digivolve", () => {
    expect(digivolutionRequirementsFor("BT26-051")).toContainEqual({
      level: 2,
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
    });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.effects?.[0]?.keywords).toEqual(
      expect.arrayContaining([expect.objectContaining({ keyword: "Detach" })]),
    );
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          actions: [
            { kind: "SelectBind", target: { bindAs: "grantTarget" } },
            { kind: "GainKeyword", keyword: { keyword: "Collision" } },
            { kind: "ModifyDP", amount: 3000 },
          ],
        },
      ],
    });
    expect(compiled.effects?.[1]).not.toHaveProperty("isLinked");
    expect(compiled.effects?.[2]).toMatchObject({
      isLinked: true,
      actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [{ kind: "DeDigivolve", amount: 2 }] }],
    });
  });

  it("publicly grants Collision and +3000 DP to an eligible Digimon when linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-051", as: "gomimon" }],
          hand: [{ card: "BT26-019", as: "mailmon" }],
        },
        1: { battleArea: [{ card: "BT1-089", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("gomimon"), "Detach")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mailmon").instanceId,
        targetPermanentId: s.perm("gomimon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gomimon").currentDP === 7000);

    expect(s.perm("gomimon").currentDP).toBe(7000);
    expect(observe(s.engine).hasKeyword(s.perm("gomimon"), "Collision")).toBe(true);
  });

  it("binds one recipient so Collision and +3000 DP can't be split between Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-051", as: "gomimon" },
            { card: "BT26-029", as: "otherEligible" },
          ],
          hand: [{ card: "BT26-019", as: "mailmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();
    const originalDp = new Map([
      [s.perm("gomimon").permanentId, s.perm("gomimon").currentDP],
      [s.perm("otherEligible").permanentId, s.perm("otherEligible").currentDP],
    ]);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mailmon").instanceId,
        targetPermanentId: s.perm("gomimon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        [s.perm("gomimon"), s.perm("otherEligible")].filter((permanent) =>
          observe(s.engine).hasKeyword(permanent, "Collision"),
        ).length === 1,
    );

    const buffed = [s.perm("gomimon"), s.perm("otherEligible")].filter((permanent) =>
      observe(s.engine).hasKeyword(permanent, "Collision"),
    );
    expect(buffed).toHaveLength(1);
    expect(observe(s.engine).hasKeyword(buffed[0]!, "Collision")).toBe(true);
    expect(buffed[0]!.currentDP).toBe(originalDp.get(buffed[0]!.permanentId)! + 3000);
  });

  it("applies linked-face De-Digivolve 2 when Gomimon is linked to an Appmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-019", as: "host" }],
          hand: [{ card: "BT26-051", as: "gomimonLink" }],
        },
        1: {
          battleArea: [
            {
              card: "BT26-049",
              as: "opponent",
              under: [
                { card: "BT26-036", as: "bottom" },
                { card: "BT26-039", as: "upper" },
              ],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("gomimonLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").topCard.instanceId === s.inst("bottom").instanceId);

    expect(s.perm("opponent").topCard.instanceId).toBe(s.inst("bottom").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("upper").instanceId, s.inst("opponent").instanceId]),
    );
  });

  it("grants Collision and +3000 DP only once when Gomimon gets linked twice in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-051", as: "gomimon" }],
          hand: [
            { card: "BT26-019", as: "firstLink" },
            { card: "BT26-019", as: "secondLink" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    for (const alias of ["firstLink", "secondLink"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "linkCard",
          instanceId: s.inst(alias).instanceId,
          targetPermanentId: s.perm("gomimon").permanentId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("gomimon").linked.some(({ instanceId }) => instanceId === s.inst(alias).instanceId));
    }

    expect(s.perm("gomimon").currentDP).toBe(7000);
    expect(observe(s.engine).hasKeyword(s.perm("gomimon"), "Collision")).toBe(true);
  });
});
