import type { CompiledCard } from "@aegis/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import printedMuchomon from "../../cards/BT1/BT1-013.js";
import printedKokatorimon from "../../cards/BT1/BT1-014.js";
import { registerIrCard } from "./interpreter.js";
import { settle, setupEngine } from "../testkit/harness.js";

const SOURCE = "BT1-013";
const SEARCH_SOURCE = "BT1-014";

const playFromZoneSource: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayFromZone",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Aegiochusmon: Dark"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

const searchSource: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          searchZone: "security",
          filter: {
            zone: "security",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Aegiochusmon: Dark"], match: "nameExact" }],
          },
          count: 1,
          then: { kind: "PlayWithoutCost", target: { filter: {}, count: 1 }, payCost: false },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

beforeAll(() => {
  registerIrCard(SOURCE, playFromZoneSource);
  registerIrCard(SEARCH_SOURCE, searchSource);
});
afterAll(() => {
  registerIrCard(SOURCE, printedMuchomon);
  registerIrCard(SEARCH_SOURCE, printedKokatorimon);
});

describe("effect-played Assembly", () => {
  it("offers Assembly when PlayFromZone plays a Digimon from trash", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: SOURCE, as: "source" }],
        trash: [
          { card: "BT26-073", as: "dark" },
          { card: "BT26-069", as: "assemblyMaterial" },
        ],
      },
    });
    await s.ready();

    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" &&
        JSON.parse(s.state.pendingDecision.payloadJson).assemblyCardId === "BT26-073",
    );
    expect(JSON.parse(s.state.pendingDecision!.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("assemblyMaterial").instanceId],
      min: 0,
      max: 1,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("assemblyMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-073"));

    const dark = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-073");
    expect(dark?.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("assemblyMaterial").instanceId]);
  });

  it("offers Assembly when Search plays a selected Digimon from security", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: SEARCH_SOURCE, as: "source" }],
        security: [{ card: "BT26-073", as: "dark" }],
        trash: [{ card: "BT26-069", as: "assemblyMaterial" }],
      },
    });
    await s.ready();

    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("dark").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" &&
        JSON.parse(s.state.pendingDecision.payloadJson).assemblyCardId === "BT26-073",
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("assemblyMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-073"));

    const dark = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT26-073");
    expect(dark?.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("assemblyMaterial").instanceId]);
  });
});
