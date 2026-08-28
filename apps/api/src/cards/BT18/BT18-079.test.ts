import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-079.js";

describe("BT18-079 Velgrmon", () => {
	it("matches the catalog and full IR color scaling, end-of-attack, and alternate-route contract", () => {
		expect(getCardDefinition("BT18-079")).toMatchObject({
			cardId: "BT18-079",
			nameEn: "Velgrmon",
			colors: ["Purple"],
			kinds: ["Digimon"],
			level: 4,
			playCost: 7,
			dp: 7000,
			evoCosts: [{ color: "Purple", level: 3, memoryCost: 4 }],
			forms: ["Hybrid"],
			attributes: ["Variable"],
			types: ["Giant Bird"],
			inheritedEffectText: "＜Retaliation＞.",
		});
		expect(compiled).toMatchObject({
			effects: [
				...(["OnPlay", "WhenDigivolving"] as const).map((trigger) => ({
					trigger,
					actions: [
						{
							kind: "TrashTopDeck",
							controller: "both",
							amount: 1,
							scaling: {
								per: 1,
								filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
								unit: "colors",
							},
							trackCount: "trashedThisEffect",
						},
						{
							kind: "ModifyDP",
							target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
							amount: 1000,
							duration: "forTheTurn",
							scaling: { per: 1, unit: "namedCount", countSource: "trashedThisEffect" },
						},
					],
				})),
				{
					trigger: "EndOfAttack",
					actions: [
						{
							kind: "Delete",
							target: {
								filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" },
								count: "all",
							},
							cost: { kind: "deleteOwn" },
							optional: true,
							abortOnDecline: true,
						},
					],
				},
				{ trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Retaliation" }] },
			],
			coverage: "full",
			residual: [],
			digivolutionRequirement: [
				{ names: ["Koichi Kimura"], cost: 3, isAlternate: true },
				{ names: ["Duskmon"], cost: 1, isAlternate: true },
			],
		});
	});

	it("naturally plays and trashes one card per distinct opposing color from both decks", async () => {
		const s = setupEngine(
			{
				0: { hand: [{ card: "BT18-079", as: "velgr" }], deck: ["BT1-010", "BT1-010", "BT1-010"] },
				1: {
					battleArea: [
						{ card: "BT1-010", as: "redDigimon" },
						{ card: "BT1-032", as: "blueDigimon" },
						{ card: "BT9-084", as: "redYellowTamer" },
					],
					deck: ["BT1-010", "BT1-010", "BT1-010"],
				},
			},
			{ autoSelectCards: true },
		);
		s.state.memory = 7;

		expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("velgr").instanceId })).toEqual({ ok: true });
		await settle(() => s.state.players[0]!.deck.length === 0 && s.state.players[1]!.deck.length === 0);

		expect(s.state.players[0]!.trash).toHaveLength(3);
		expect(s.state.players[1]!.trash).toHaveLength(3);
		expect(s.perm("velgr").currentDP).toBe(13000);
		expect(s.state.memory).toBe(0);
		assertNoLoudGap(s);
	});

	it("naturally evolves from a legal purple level-3 peer and resolves the same scaling", async () => {
		const s = setupEngine(
			{
				0: {
					battleArea: [{ card: "BT18-075", as: "base" }],
					hand: [{ card: "BT18-079", as: "velgr" }],
					deck: ["BT1-010", "BT1-010", "BT1-010"],
				},
				1: {
					battleArea: [
						{ card: "BT1-010", as: "redDigimon" },
						{ card: "BT1-032", as: "blueDigimon" },
						{ card: "BT9-084", as: "redYellowTamer" },
					],
					deck: ["BT1-010", "BT1-010", "BT1-010"],
				},
			},
			{ autoSelectCards: true },
		);
		s.state.memory = 4;

		expect(
			s.engine.applyIntent(0, {
				type: "digivolve",
				permanentId: s.perm("base").permanentId,
				instanceId: s.inst("velgr").instanceId,
			}),
		).toEqual({ ok: true });
		await settle(() => s.perm("base").topCard?.cardId === "BT18-079" && s.state.players[0]!.deck.length === 0);

		expect(s.state.players[0]!.trash).toHaveLength(3);
		expect(s.state.players[1]!.trash).toHaveLength(3);
		expect(s.perm("base").currentDP).toBe(13000);
		expect(s.state.memory).toBe(0);
		assertNoLoudGap(s);
	});

	it("naturally resolves End of Attack by deleting a legal own cost and all lowest-level opponents", async () => {
		const preferred: string[] = [];
		const s = setupEngine(
			{
				0: {
					battleArea: [
						{ card: "BT18-077", as: "sacrifice" },
						{ card: "BT18-079", as: "velgr" },
					],
				},
				1: {
					battleArea: [
						{ card: "BT1-009", as: "lowOne" },
						{ card: "BT1-010", as: "lowTwo" },
						{ card: "BT1-032", as: "higher" },
					],
				},
			},
			{ autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
		);
		preferred.push(s.perm("sacrifice").topCard!.instanceId);
		s.state.memory = 3;
		const sacrificeId = s.perm("sacrifice").permanentId;
		const lowOneId = s.perm("lowOne").permanentId;
		const lowTwoId = s.perm("lowTwo").permanentId;

		expect(
			s.engine.applyIntent(0, {
				type: "attack",
				attackerPermanentId: s.perm("velgr").permanentId,
				target: { kind: "player" },
			}),
		).toEqual({ ok: true });
		await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== sacrificeId));

		expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT18-079")).toBe(true);
		expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
		expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowOneId)).toBe(false);
		expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowTwoId)).toBe(false);
		expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-032")).toBe(true);
		assertNoLoudGap(s);
	});

	it("naturally applies inherited Retaliation from a legal Velgrmon-under-Oboromon stack", async () => {
		const s = setupEngine(
			{
				0: { battleArea: [{ card: "BT18-080", as: "host", dp: 5000, suspended: true, under: ["BT18-079"] }] },
				1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 7000 }] },
			},
			{ autoSelectCards: true },
		);
		s.state.turnSeat = 1;
		const hostId = s.perm("host").permanentId;
		const attackerId = s.perm("attacker").permanentId;

		expect(
			s.engine.applyIntent(1, {
				type: "attack",
				attackerPermanentId: attackerId,
				target: { kind: "permanent", permanentId: hostId },
			}),
		).toEqual({ ok: true });
		await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT18-079"));

		expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
		expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === attackerId)).toBe(false);
		assertNoLoudGap(s);
	});
});
