import { expect, it } from "vitest";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { parseCreateTournament } from "#api/tournaments/rules/parseCreateTournament";
import { validateCreateTournament } from "#api/tournaments/rules/validation";

const body = {
  name: "Sealed Swiss",
  startsAt: Date.now() + 10000,
  maxPlayers: 8,
  structure: "swiss",
  sealedConfiguration: getSealedConfiguration({ setId: "BT4" }),
};
it("defaults sealed creation to BO3 and rejects an explicit BO1 at parsing", () => {
  expect(parseCreateTournament(body)?.input.bestOf).toBe(3);
  expect(parseCreateTournament({ ...body, bestOf: 1 })).toBeUndefined();
});
it("refuses sealed BO1 and omitted match format at domain validation", () => {
  const parsed = parseCreateTournament({ ...body, bestOf: 3 })!;
  expect(validateCreateTournament({ ...parsed.input, bestOf: 1 }, Date.now()).ok).toBe(false);
  expect(validateCreateTournament({ ...parsed.input, bestOf: undefined } as never, Date.now()).ok).toBe(false);
  expect(validateCreateTournament(parsed.input, Date.now()).ok).toBe(true);
});

it.each(["BT4", "EX13", "BT26"])("accepts frozen %s configuration through parsing and domain validation", (setId) => {
  const config = getSealedConfiguration({ setId });
  const parsed = parseCreateTournament({ ...body, sealedConfiguration: config });
  expect(parsed?.input.sealedConfiguration).toEqual(config);
  expect(validateCreateTournament(parsed!.input, Date.now()).ok).toBe(true);
});

it.each(["BT27", "unknown", "constructor"])("rejects forged %s configuration in both validation layers", (setId) => {
  const config = { ...body.sealedConfiguration, setId };
  expect(parseCreateTournament({ ...body, sealedConfiguration: config })).toBeUndefined();
  const input = parseCreateTournament(body)!.input;
  expect(validateCreateTournament({ ...input, sealedConfiguration: config }, Date.now()).ok).toBe(false);
});
