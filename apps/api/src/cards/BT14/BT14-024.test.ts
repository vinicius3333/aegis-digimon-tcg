import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-024.js";

describe("BT14-024", () => it("inherits once-per-turn trashing of two bottom opposing digivolution cards when attacked", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }] }] })));
