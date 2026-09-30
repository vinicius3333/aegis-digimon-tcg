import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import {
  blitzThroughCopiedGammamon,
  digivolveOverWhenDigivolvingGammamon,
  hiroWasPlayed,
  hostDpWithGammamonInheritedSource,
} from "./gammamonCopy.testSupport.js";

describe("RB1-009 Canoweissmon", () => {
  it("digivolves from hand onto a Gammamon carrying a Gammamon-named card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-008", as: "host", under: [{ card: "RB1-005" }] }],
          hand: [{ card: "RB1-009", as: "canoweissmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "RB1-009");

    expect(s.perm("host").topCard.cardId).toBe("RB1-009");
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.filter((card) => card.cardId === "RB1-005")).toHaveLength(1);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["RB1-005", "RB1-008"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("uses the special cost-3 path from Lv.3 Gammamon when its stack has Gammamon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-008" }] }],
        hand: [{ card: "RB1-009", as: "canoweissmon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "RB1-009");
    expect(s.state.memory).toBe(0);
  });

  it("can use the printed Lv.4 Gammamon-name evolution without the special stack condition", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-021", as: "host" }],
        hand: [{ card: "RB1-009", as: "canoweissmon" }],
      },
    });
    const oldTopId = s.perm("host").topCard.instanceId;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "RB1-009");
    expect(s.perm("host").topCard.cardId).toBe("RB1-009");
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([oldTopId]);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("copies effects from a Gammamon-named source but not inherited effects", async () => {
    const sourceEffect = setupEngine({
      0: { battleArea: [{ card: "RB1-009", as: "host", under: [{ card: "RB1-008" }] }] },
    });
    await sourceEffect.ready();
    expect(observe(sourceEffect.engine).hasKeyword(sourceEffect.perm("host"), "Raid")).toBe(true);

    const inheritedOnly = setupEngine({
      0: { battleArea: [{ card: "RB1-009", as: "host", under: [{ card: "RB1-005" }] }] },
    });
    await inheritedOnly.ready();
    expect(inheritedOnly.perm("host").currentDP).toBe(10000);
  });
});

describe("RB1-009 Canoweissmon — KB Q&A rulings", () => {
  async function digivolveCanoweissmon(host: { card: string; under: string[] }, alternateRequirementIndex?: number) {
    const s = setupEngine({
      0: {
        battleArea: [{ card: host.card, as: "host", under: host.under.map((card) => ({ card })) }],
        hand: [{ card: "RB1-009", as: "canoweissmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("canoweissmon").instanceId,
      ...(alternateRequirementIndex === undefined ? {} : { alternateRequirementIndex }),
    });
    if (result.ok) await settle(() => s.perm("host").topCard.cardId === "RB1-009");
    return { result, topCardId: s.perm("host").topCard.cardId, memory: s.state.memory };
  }

  it.each([
    ["BetelGammamon", "RB1-008"],
    ["KausGammamon", "RB1-012"],
    ["WezenGammamon", "RB1-021"],
    ["GulusGammamon", "RB1-029"],
  ])(
    "refuses the special path from %s but allows its printed Lv.4 requirement (Q4080)",
    async (_name, hostCardId) => {
      const host = { card: hostCardId, under: ["RB1-005"] };

      const special = await digivolveCanoweissmon(host, 0);
      expect(special.result).toMatchObject({ ok: false });
      expect(special.topCardId).toBe(hostCardId);
      expect(special.memory).toBe(3);

      const printed = await digivolveCanoweissmon(host);
      expect(printed.result).toEqual({ ok: true });
      expect(printed.topCardId).toBe("RB1-009");
      expect(printed.memory).toBe(0);
    },
  );

  it("uses the special path only from a [Gammamon] that has a Gammamon-named digivolution card (Q4080)", async () => {
    const withGammamonSource = await digivolveCanoweissmon({ card: "RB1-005", under: ["RB1-008"] }, 0);
    expect(withGammamonSource.result).toEqual({ ok: true });
    expect(withGammamonSource.topCardId).toBe("RB1-009");
    expect(withGammamonSource.memory).toBe(0);

    const withoutGammamonSource = await digivolveCanoweissmon({ card: "RB1-005", under: ["BT1-001"] }, 0);
    expect(withoutGammamonSource.result).toMatchObject({ ok: false });
    expect(withoutGammamonSource.topCardId).toBe("RB1-005");
    expect(withoutGammamonSource.memory).toBe(3);
  });

  it("triggers the [When Digivolving] effect gained from a Gammamon-named digivolution card (Q4081)", async () => {
    const s = await digivolveOverWhenDigivolvingGammamon("RB1-009");

    expect(s.perm("host").topCard.cardId).toBe("RB1-009");
    expect(hiroWasPlayed(s)).toBe(true);
  });

  it("activates a gained [When Digivolving] ＜Blitz＞ and attacks while the opponent has memory (Q4082)", async () => {
    const s = await blitzThroughCopiedGammamon("RB1-009");

    expect(s.perm("host").topCard.cardId).toBe("RB1-009");
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("digivolves a [Gammamon] with a Gammamon-named source into it through another effect's digivolve (Q4083)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "RB1-005", as: "gammamon", under: [{ card: "RB1-008" }] },
          ],
          hand: [{ card: "RB1-009", as: "canoweissmon" }],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.perm("gammamon").topCard.instanceId, s.inst("canoweissmon").instanceId);

    const entries = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gammamon").topCard.cardId === "RB1-009");
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("gammamon").topCard.cardId).toBe("RB1-009");
    expect(s.perm("gammamon").stack.map((card) => card.cardId)).toEqual(["RB1-008", "RB1-005"]);
    expect(s.state.memory).toBe(2);
  });

  it("does not activate a Gammamon-named source's inherited effect a second time as its own (Q4084)", async () => {
    expect(await hostDpWithGammamonInheritedSource([], "RB1-009")).toBe(8000 + 2000);
    expect(await hostDpWithGammamonInheritedSource(["RB1-009"], "RB1-010")).toBe(11000 + 2000);
  });
});
