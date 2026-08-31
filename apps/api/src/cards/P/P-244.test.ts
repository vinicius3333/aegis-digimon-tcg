import { describe, expect, it } from "vitest";
import { EffectTiming, Zone } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./P-244.js";
import "../index.js";

describe("P-244 Unique Emblem: Ragnarok Attainer", () => {
  it("delays on an effect-added Vemmon card and uses normal reduced-cost digivolution requirements", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          addedDigivolutionCardFilter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand", "trash"],
              reduceCost: 3,
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });

  it("uses from hand, plays a qualifying Vemmon/Zenith, and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "host" }],
          hand: [{ card: "P-244", as: "option" }],
          trash: [{ card: "BT11-061", as: "vemmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-244"), 500);
    expect(
      s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT11-061").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("plays EX11-066 Xeno from trash because its Rule also treats its name as Zenith", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-061", as: "host" }],
          hand: [{ card: "P-244", as: "option" }],
          trash: [{ card: "EX11-066", as: "xeno" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-244"), 500);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX11-066")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX11-066")).toBe(false);
  });

  it("keeps P-244 in play when its Delay is declined during BT21-062's real Vemmon placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-062", as: "galacticmon" }],
          hand: [
            { card: "P-244", as: "emblem" },
            { card: "BT21-098", as: "cannon" },
          ],
          trash: ["BT18-092", "BT11-065", "BT11-065", "BT11-065", "BT11-065"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "P-244"));
    const mainDecision = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "P-244")!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: mainDecision.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-244"));
    await settle(() => s.state.pendingDecision === undefined);
    const emblemPermanentId = s.perm("emblem").permanentId;
    s.state.turnCount += 1;
    const nextGalacticmon = s.give(0, Zone.Hand, { card: "EX11-046", as: "nextGalacticmon" });

    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galacticmon"));

    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT21-062"));
    const galacticmonDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.sourceCardId === "BT21-062",
    )?.req;
    expect(galacticmonDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: galacticmonDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.promptText.includes("Delay")), 500);
    const delayDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.promptText.includes("Delay"),
    )?.req;
    expect(delayDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: delayDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === emblemPermanentId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "P-244")).toBe(false);
    expect(s.perm("galacticmon").topCard.cardId).toBe("BT21-062");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === nextGalacticmon.instanceId)).toBe(true);
  });

  it("accepts Delay and pays the qualifying digivolution with exactly 3 memory reduced", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-062", as: "galacticmon" }],
          hand: [
            { card: "P-244", as: "emblem" },
            { card: "BT21-098", as: "cannon" },
          ],
          trash: ["BT18-092", "BT11-065", "BT11-065", "BT11-065", "BT11-065"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "P-244"));
    const mainDecision = s.decisions.find(({ req }) => req.kind === "optional" && req.sourceCardId === "P-244")?.req;
    expect(mainDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: mainDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "P-244"));
    await settle(() => s.state.pendingDecision === undefined);
    s.state.turnCount += 1;
    const nextGalacticmon = s.give(0, Zone.Hand, { card: "EX11-046", as: "nextGalacticmon" });
    const beforeDigivolve = s.state.memory;

    const resolution = advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("galacticmon"));
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "BT21-062"));
    const galacticmonDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.sourceCardId === "BT21-062",
    )?.req;
    expect(galacticmonDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: galacticmonDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.promptText.includes("Delay")), 500);
    const delayDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.promptText.includes("Delay"),
    )?.req;
    expect(delayDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: delayDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional" && req.promptText === "Digivolve"), 500);
    const digivolveDecision = s.decisions.find(
      ({ req }) => req.kind === "optional" && req.promptText === "Digivolve",
    )?.req;
    expect(digivolveDecision).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: digivolveDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await resolution;

    await settle(() => s.perm("galacticmon").topCard.instanceId === nextGalacticmon.instanceId);
    expect(s.state.memory).toBe(beforeDigivolve - 2);
    expect(s.state.memory).toBe(beforeDigivolve - (5 - 3));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "P-244")).toBe(true);
    expect(s.perm("galacticmon").stack.some((card) => card.cardId === "BT21-062")).toBe(true);
  });
});
