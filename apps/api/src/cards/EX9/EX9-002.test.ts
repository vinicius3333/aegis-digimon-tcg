import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-002.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX9-002", () => {
  it("pays the reduced cost after real Training rather than evolving for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-015", as: "host", under: ["EX9-002"] }],
          hand: ["EX9-017"],
          deck: ["BT1-001", "BT1-048"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;
    await s.ready();
    const ability = observe(s.engine).activatableEffects(s.perm("host"))[0]!;
    expect(ability).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("host").topCard.instanceId,
        effectKey: ability.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("EX9-017");
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").stack.some((card) => card.cardId === "EX9-002" && card.faceUp)).toBe(true);
    expect(s.perm("host").stack.some((card) => card.cardId === "EX9-015" && card.faceUp)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("inherits a once-per-turn Ver.2 digivolution after adding digivolution cards", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, payCost: true, optional: true }],
        },
      ],
    }));

  it("digivolves into a Ver.2 from hand when a face-down card is added to its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-014", as: "host", under: [{ card: "EX9-002" }, { card: "BT1-009", faceUp: false }] },
          ],
          hand: ["EX9-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 1;
    const host = s.perm("host");
    const added = host.stack.find((card) => card.cardId === "BT1-009")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
    });
    await settle(() => host.topCard?.cardId === "EX9-017");

    expect(host.topCard?.cardId).toBe("EX9-017");
    expect(host.stack.map((card) => card.cardId)).toEqual(["EX9-002", "BT1-009", "EX9-014"]);
  });

  it("does not digivolve when the added card is face up", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-014", as: "host", under: [{ card: "EX9-002" }, "BT1-009"] }],
          hand: ["EX9-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const host = s.perm("host");
    const added = host.stack.find((card) => card.cardId === "BT1-009")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
    });

    expect(host.topCard?.cardId).toBe("EX9-014");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-017")).toBe(true);
  });

  it("only reacts when this Digimon's own stack receives the face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-014", as: "host", under: [{ card: "EX9-002" }, { card: "BT1-009", faceUp: false }] },
            { card: "EX9-014", as: "otherHost", under: [{ card: "BT1-010", faceUp: false }] },
          ],
          hand: ["EX9-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const otherHost = s.perm("otherHost");
    const added = otherHost.stack[0]!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: otherHost.permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX9-017"));

    expect(s.perm("host").topCard?.cardId).toBe("EX9-014");
    expect(otherHost.topCard?.cardId).toBe("EX9-014");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-017")).toBe(true);
  });

  it("does not offer a non-Ver.2 card as the evolution destination", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-014", as: "host", under: [{ card: "EX9-002" }, { card: "BT1-009", faceUp: false }] },
          ],
          hand: ["EX9-053"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const host = s.perm("host");
    const added = host.stack.find((card) => card.cardId === "BT1-009")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
    });

    expect(host.topCard?.cardId).toBe("EX9-014");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-053")).toBe(true);
  });

  it("allows declining the optional evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-014", as: "host", under: [{ card: "EX9-002" }, { card: "BT1-009", faceUp: false }] },
          ],
          hand: ["EX9-017"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const host = s.perm("host");
    const added = host.stack.find((card) => card.cardId === "BT1-009")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [added.instanceId],
    });

    expect(host.topCard?.cardId).toBe("EX9-014");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-017")).toBe(true);
  });

  it("can activate only once per turn even when another face-down card is added", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-017",
              as: "host",
              under: [{ card: "EX9-002" }, { card: "BT1-009", faceUp: false }, { card: "BT1-010", faceUp: false }],
            },
          ],
          hand: ["EX9-018", "EX9-020"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    const host = s.perm("host");
    const firstAdded = host.stack.find((card) => card.cardId === "BT1-009")!;
    const secondAdded = host.stack.find((card) => card.cardId === "BT1-010")!;

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [firstAdded.instanceId],
    });
    await settle(() => host.topCard?.cardId === "EX9-018");

    await advance(s.engine).fireSubTrigger("onAddDigivolutionCards", {
      subjectPermanentId: host.permanentId,
      addedDigivolutionCardInstanceIds: [secondAdded.instanceId],
    });
    expect(host.topCard?.cardId).toBe("EX9-018");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-020")).toBe(true);
  });
});
