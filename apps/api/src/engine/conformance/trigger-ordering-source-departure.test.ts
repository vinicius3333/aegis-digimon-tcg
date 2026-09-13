import { beforeEach, describe, expect, it } from "vitest";
import { cite } from "./_kb.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";

const SIMULTANEOUS_SHA256 = "8d2bf2fd50af6a37b28b64a0db252f4d9d0a9f033e72539337b25d6d330e5494";
const PENDING_ACTIVATION_SHA256 = "a67b8c006fddd924465986923295d048cb04f1430880d8750558da4c425f05a0";
const DERIVED_TRIGGER_SHA256 = "c12a72babb8fa25e11755af5c32e4d0efccdb4e812e15d3b2dd8cc2e2df1ee50";
const IMMEDIATE_TYPE_SHA256 = "50033be9509953fb2b00c56799e11cee1838740d4c5c06a962969a748a6fcdde";
const DELETION_PENDING_TOP_SHA256 = "8591423c545be03c90aa350157893da9538e16a3fbbb42459c031ea2258d6932";
const ON_DELETION_EVENT_SHA256 = "e24eb2b826f21a8fa8a09e42fa4c357c7f46c5f7fcedbb93fe8955b3b00d3afc";

describe("bounded trigger ordering and pending source departure", () => {
  beforeEach(() => {
    cite("comprehensive-0164", "§15-4-3 Simultaneous Triggering", SIMULTANEOUS_SHA256);
    cite("comprehensive-0165", "§15-4-4 Pending Activation", PENDING_ACTIVATION_SHA256);
    cite("comprehensive-0166", "§15-4-5 Derived Triggering", DERIVED_TRIGGER_SHA256);
    cite("comprehensive-0177", "§15-8-5 Immediate-Type Effects", IMMEDIATE_TYPE_SHA256);
    cite(
      "comprehensive-0173",
      "§15-8-3-5 deletion triggers remain pending for the original top card",
      DELETION_PENDING_TOP_SHA256,
    );
    cite("comprehensive-0210", "§15-16-4-1 On Deletion triggers at card deletion", ON_DELETION_EVENT_SHA256);
  });

  it("offers simultaneous optional deletion triggers to the owning controllers in turn-player order", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-040", as: "turnHolder", suspended: true }],
          security: [{ card: "BT1-028", as: "turnSecurity" }],
        },
        1: {
          battleArea: [{ card: "BT25-040", as: "opponentHolder", suspended: true }],
          security: [{ card: "BT1-028", as: "opponentSecurity" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Equal-DP battle deletion is the public legal action that creates one simultaneous
    // deletion event for both physical Ascension holders.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("turnHolder").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentHolder").permanentId },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const first = s.state.pendingDecision!;
    expect(first.seat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const second = s.state.pendingDecision!;
    expect(second.seat).toBe(1);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: second.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle();
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("turnHolder").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("opponentHolder").instanceId,
    );
    const surrender = s.state.gameOver ? undefined : s.engine.applyIntent(0, { type: "surrender" });
    expect(surrender === undefined || surrender.ok).toBe(true);
    await loop;
  });

  it("offers two real trash triggers together, then drops only the source that departed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT11-083", as: "base" }],
          hand: [{ card: "EX7-061", as: "lilithmonX" }],
          trash: [
            { card: "EX7-072", as: "first" },
            { card: "EX7-072", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lilithmonX").instanceId,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    const keys = request.options?.triggerKeys ?? [];
    expect(keys).toHaveLength(2);
    expect(keys).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${s.inst("first").instanceId}::`),
        expect.stringContaining(`${s.inst("second").instanceId}::`),
      ]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "orderTriggers", order: [keys[0]!] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.players[0]!.deck.some(({ instanceId }) => instanceId === s.inst("first").instanceId));

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("first").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("second").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).not.toEqual(
      expect.arrayContaining([s.inst("first").instanceId, s.inst("second").instanceId]),
    );
  });

  it("keeps the public deletion priority turn-player-first with valid optional payloads", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-065", as: "turnMachine", dp: 11000 }],
          trash: [{ card: "ST5-10", as: "playedMachine" }],
        },
        1: {
          battleArea: [
            { card: "BT19-065", as: "opponentMachine", dp: 11000, suspended: true },
            { card: "BT19-020", as: "derivedVictim" },
          ],
          hand: [{ card: "BT19-081", as: "kiriha" }],
          trash: [{ card: "ST5-10", as: "olderMaterial" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.phase).toBe("Main");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("turnMachine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentMachine").permanentId },
      }),
    ).toMatchObject({ ok: true });
    expect(s.state.turnSeat).toBe(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("turnMachine").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("opponentMachine").instanceId,
    );
    const first = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === first.decisionId)?.req;
    expect({ seat: first.seat, sourceCardId: request?.sourceCardId }).toEqual({ seat: 0, sourceCardId: "BT19-065" });
    const surrender = s.state.gameOver ? undefined : s.engine.applyIntent(0, { type: "surrender" });
    expect(surrender === undefined || surrender.ok).toBe(true);
    await loop;
  });

  it("resolves an inherited OnDeletion after its host leaves in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-065", as: "attacker", dp: 11000 },
            { card: "BT20-071", as: "survivor", under: [{ card: "BT20-070" }] },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            {
              card: "BT20-078",
              as: "deletedHost",
              dp: 11000,
              suspended: true,
              under: [{ card: "BT20-073", as: "metal" }],
            },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const hostId = s.inst("deletedHost").instanceId;
      const metalId = s.inst("metal").instanceId;
      const attackerId = s.inst("attacker").instanceId;
      const survivorId = s.inst("survivor").instanceId;
      const survivorSourceId = s.perm("survivor").stack[0]!.instanceId;
      expect(s.perm("deletedHost").stack.map((card) => card.instanceId)).toEqual([metalId]);
      expect(s.perm("survivor").stack).toHaveLength(1);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("deletedHost").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === hostId));
      await settle(() => s.perm("survivor").stack.length === 0);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
        survivorSourceId,
      );
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(survivorId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(attackerId);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
        expect.arrayContaining([hostId, metalId]),
      );
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });

  it("prioritizes a public derived deletion trigger over an older pending trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-065", as: "turnMachine", dp: 11000 },
            { card: "BT1-009", as: "turnSacrifice" },
          ],
          trash: [{ card: "BT20-073", as: "playedMachine" }],
        },
        1: {
          battleArea: [
            { card: "BT19-065", as: "opponentMachine", dp: 11000, suspended: true },
            { card: "BT19-020", as: "derivedVictim" },
          ],
          hand: [{ card: "BT19-081", as: "kiriha" }],
          trash: [{ card: "ST5-10", as: "olderMaterial" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.turnSeat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("turnMachine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("opponentMachine").permanentId },
      }),
    ).toMatchObject({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const initial = s.state.pendingDecision!;
    expect(initial.seat).toBe(0);
    expect(s.decisions.find(({ req }) => req.decisionId === initial.decisionId)?.req.sourceCardId).toBe("BT19-065");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: initial.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toMatchObject({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "optional");
    const cost = s.state.pendingDecision!;
    expect(s.decisions.find(({ req }) => req.decisionId === cost.decisionId)?.req.sourceCardId).toBe("BT20-073");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const sacrifice = s.state.pendingDecision!;
    const sacrificeRequest = s.decisions.find(({ req }) => req.decisionId === sacrifice.decisionId)?.req;
    expect(sacrificeRequest?.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("turnSacrifice").permanentId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: sacrifice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("turnSacrifice").permanentId] },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const derived = s.state.pendingDecision!;
    const derivedRequest = s.decisions.find(({ req }) => req.decisionId === derived.decisionId)?.req;
    expect(derived.seat).toBe(1);
    expect(derivedRequest?.sourceCardId).toBe("BT19-020");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: derived.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toMatchObject({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const older = s.state.pendingDecision!;
    const olderRequest = s.decisions.find(({ req }) => req.decisionId === older.decisionId)?.req;
    expect(older.seat).toBe(1);
    expect(olderRequest?.sourceCardId).toBe("BT19-065");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: older.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toMatchObject({ ok: true });
    await settle();
    const surrender = s.state.gameOver ? undefined : s.engine.applyIntent(0, { type: "surrender" });
    expect(surrender === undefined || surrender.ok).toBe(true);
    await loop;
  });

  it("drops an enemy Bacchusmon watcher when its source is deleted before activation", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-065", as: "turnMachine" },
            { card: "BT25-077", as: "ownBacchus" },
          ],
          trash: [{ card: "BT20-073", as: "metalPhantomon" }],
          security: [{ card: "BT1-028", as: "turnSecurity" }],
        },
        1: {
          battleArea: [
            { card: "BT19-065", as: "opponentMachine", suspended: true },
            { card: "BT25-077", as: "opponentBacchus" },
          ],
          security: [{ card: "BT1-028", as: "opponentSecurity" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 3;
      const turnMachineId = s.inst("turnMachine").instanceId;
      const opponentMachineId = s.inst("opponentMachine").instanceId;
      const opponentBacchusId = s.inst("opponentBacchus").instanceId;
      const turnSecurityId = s.inst("turnSecurity").instanceId;
      const opponentSecurityId = s.inst("opponentSecurity").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("turnMachine").permanentId,
          target: { kind: "permanent", permanentId: s.perm("opponentMachine").permanentId },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === turnMachineId));
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(opponentMachineId);

      await settle(() => s.state.pendingDecision?.kind === "optional");
      const play = s.state.pendingDecision!;
      expect(play.seat).toBe(0);
      expect(s.decisions.find(({ req }) => req.decisionId === play.decisionId)?.req.sourceCardId).toBe("BT19-065");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: play.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const metalCost = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === metalCost.decisionId)?.req.sourceCardId).toBe("BT20-073");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: metalCost.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const ownWatcher = s.state.pendingDecision!;
      expect(ownWatcher.seat).toBe(0);
      expect(s.decisions.find(({ req }) => req.decisionId === ownWatcher.decisionId)?.req.sourceCardId).toBe(
        "BT25-077",
      );
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: ownWatcher.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const suspend = s.state.pendingDecision!;
      expect(suspend.seat).toBe(0);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: suspend.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm("ownBacchus").permanentId] },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === opponentBacchusId));
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).not.toContain(
        opponentBacchusId,
      );
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toContain("BT20-073");
      expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual(
        expect.arrayContaining([opponentMachineId, opponentBacchusId]),
      );
      expect(s.state.players[1]!.security.length).toBe(1);
      expect(s.state.memory).toBe(3);
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([turnSecurityId]);
      expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([opponentSecurityId]);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });

  it("shows the pending enemy Bacchusmon watcher when a smaller Agumon survives", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-065", as: "turnMachine" },
            { card: "BT25-077", as: "ownBacchus" },
          ],
          trash: [{ card: "BT20-073", as: "metalPhantomon" }],
          security: [{ card: "BT1-028", as: "turnSecurity" }],
        },
        1: {
          battleArea: [
            { card: "BT19-065", as: "opponentMachine", suspended: true },
            { card: "BT25-077", as: "opponentBacchus" },
            { card: "BT1-009", as: "opponentAgumon" },
          ],
          security: [{ card: "BT1-028", as: "opponentSecurity" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = 3;
      const turnSecurityId = s.inst("turnSecurity").instanceId;
      const opponentSecurityId = s.inst("opponentSecurity").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("turnMachine").permanentId,
          target: { kind: "permanent", permanentId: s.perm("opponentMachine").permanentId },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const play = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === play.decisionId)?.req.sourceCardId).toBe("BT19-065");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: play.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const metalCost = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === metalCost.decisionId)?.req.sourceCardId).toBe("BT20-073");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: metalCost.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const ownWatcher = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === ownWatcher.decisionId)?.req.sourceCardId).toBe(
        "BT25-077",
      );
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: ownWatcher.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
      const suspend = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: suspend.decisionId,
          response: { kind: "chooseTargets", instanceIds: [s.perm("ownBacchus").permanentId] },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const enemyWatcher = s.state.pendingDecision!;
      expect(enemyWatcher.seat).toBe(1);
      expect(s.decisions.find(({ req }) => req.decisionId === enemyWatcher.decisionId)?.req.sourceCardId).toBe(
        "BT25-077",
      );
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: enemyWatcher.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT25-077"]);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
      expect(s.state.memory).toBe(3);
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([turnSecurityId]);
      expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([opponentSecurityId]);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });

  it("preserves inherited OnDeletion through a nested Yolei deletion window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-077", as: "attacker", under: [{ card: "BT25-077" }] },
            { card: "BT8-085", as: "yolei" },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT19-065", as: "enemy", dp: 3000, under: [{ card: "BT20-073", as: "metal" }] }],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
          trash: [{ card: "ST5-10", as: "nativePayload" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false, autoOrderTriggers: false },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const enemyId = s.inst("enemy").instanceId;
      const metalId = s.inst("metal").instanceId;
      const oldSourceId = s.perm("attacker").topCard.instanceId;
      const newSourceId = s.perm("attacker").stack[0]!.instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const yolei = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === yolei.decisionId)?.req.sourceCardId).toBe("BT8-085");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: yolei.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === enemyId));
      const order = s.state.pendingDecision!;
      const orderRequest = s.decisions.find(({ req }) => req.decisionId === order.decisionId)?.req;
      expect(order.kind).toBe("orderTriggers");
      expect(order.seat).toBe(1);
      expect(orderRequest?.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT20-073", "BT19-065"]));
      const metalKey = orderRequest?.options?.triggerKeys?.find((key) => key.startsWith(`${metalId}::BT20-073/`));
      expect(metalKey).toBeDefined();
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: order.decisionId,
          response: { kind: "orderTriggers", order: [metalKey!] },
        }),
      ).toMatchObject({ ok: true });
      await settle();
      const native = s.state.pendingDecision!;
      expect(native.kind).toBe("optional");
      expect(s.decisions.find(({ req }) => req.decisionId === native.decisionId)?.req.sourceCardId).toBe("BT19-065");
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: native.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle();
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(newSourceId);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(oldSourceId);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(metalId);
      expect(s.perm("attacker").stack).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });

  it("drops a copied Chronomon effect when its source becomes the new top card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-060", as: "chronomon", under: [{ card: "BT26-016" }] },
            { card: "BT8-085", as: "yolei" },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT19-065", as: "enemy", dp: 3000, under: [{ card: "BT20-073", as: "metal" }] },
            { card: "BT1-053", as: "survivor" },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
          trash: [{ card: "ST5-10", as: "nativePayload" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const enemyId = s.inst("enemy").instanceId;
      const metalId = s.inst("metal").instanceId;
      const oldTopId = s.perm("chronomon").topCard.instanceId;
      const newTopId = s.perm("chronomon").stack[0]!.instanceId;
      const survivorId = s.inst("survivor").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("chronomon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      const first = s.state.pendingDecision!;
      const firstRequest = s.decisions.find(({ req }) => req.decisionId === first.decisionId)?.req;
      expect(first.kind).toBe("orderTriggers");
      expect(first.seat).toBe(0);
      const firstTriggerIndex =
        firstRequest?.options?.triggerCardIds?.findIndex((cardId) => cardId === "BT8-085") ?? -1;
      const yoleiKey = firstTriggerIndex >= 0 ? firstRequest?.options?.triggerKeys?.[firstTriggerIndex] : undefined;
      expect(yoleiKey).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: first.decisionId,
          response: { kind: "orderTriggers", order: [yoleiKey!] },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const yolei = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === yolei.decisionId)?.req.sourceCardId).toBe("BT8-085");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: yolei.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === enemyId));
      const deletionOrder = s.state.pendingDecision!;
      const deletionRequest = s.decisions.find(({ req }) => req.decisionId === deletionOrder.decisionId)?.req;
      expect(deletionOrder.kind).toBe("orderTriggers");
      expect(deletionOrder.seat).toBe(1);
      const metalKey = deletionRequest?.options?.triggerKeys?.find((key) => key.startsWith(`${metalId}::BT20-073/`));
      expect(metalKey).toBeDefined();
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: deletionOrder.decisionId,
          response: { kind: "orderTriggers", order: [metalKey!] },
        }),
      ).toMatchObject({ ok: true });
      await settle();
      const native = s.state.pendingDecision!;
      expect(native.kind).toBe("optional");
      expect(s.decisions.find(({ req }) => req.decisionId === native.decisionId)?.req.sourceCardId).toBe("BT19-065");
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: native.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle();
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(oldTopId);
      expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(newTopId);
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(metalId);
      expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(survivorId);
      expect(s.decisions.some(({ req }) => req.promptText.includes("Delete 1 of your opponent's Digimon"))).toBe(false);
      const engage = s.state.pendingDecision!;
      expect(engage.kind).toBe("optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: engage.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle();
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });

  it("resolves the same copied Chronomon effect while its source remains buried", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-060", as: "chronomon", under: [{ card: "BT26-016" }] },
            { card: "BT8-085", as: "yolei" },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT19-065", as: "enemy", dp: 3000 },
            { card: "BT1-053", as: "survivor" },
          ],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
          trash: [{ card: "ST5-10", as: "nativePayload" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      const survivorId = s.inst("survivor").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("chronomon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      const order = s.state.pendingDecision!;
      const request = s.decisions.find(({ req }) => req.decisionId === order.decisionId)?.req;
      expect(order.kind).toBe("orderTriggers");
      const yoleiIndex = request?.options?.triggerCardIds?.findIndex((cardId) => cardId === "BT8-085") ?? -1;
      const yoleiKey = yoleiIndex >= 0 ? request?.options?.triggerKeys?.[yoleiIndex] : undefined;
      expect(yoleiKey).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: order.decisionId,
          response: { kind: "orderTriggers", order: [yoleiKey!] },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const yolei = s.state.pendingDecision!;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: yolei.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT19-065"));
      await settle();
      const native = s.state.pendingDecision!;
      expect(native.kind).toBe("optional");
      expect(s.decisions.find(({ req }) => req.decisionId === native.decisionId)?.req.sourceCardId).toBe("BT19-065");
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: native.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const copied = s.state.pendingDecision!;
      expect(s.decisions.find(({ req }) => req.decisionId === copied.decisionId)?.req.sourceCardId).toBe("BT26-016");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: copied.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toMatchObject({ ok: true });
      await settle();
      expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(survivorId);
      const recovery = s.state.pendingDecision!;
      expect(recovery.kind).toBe("optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: recovery.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle();
      const engage = s.state.pendingDecision!;
      expect(engage.kind).toBe("optional");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: engage.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toMatchObject({ ok: true });
      await settle();
      expect(s.state.pendingDecision).toBeUndefined();
      expect(observe(s.engine).isAttacking()).toBe(false);
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });
});
