import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-019.js";

describe("BT14-019", () => it("inherits once-per-turn trashing of two bottom digivolution cards when an opponent attacks", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: false }] }] })));
