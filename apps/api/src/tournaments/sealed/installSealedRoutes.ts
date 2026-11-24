import type { Express, Request } from "express";
import type { AccountStore, AuthSession } from "#api/accounts/AccountStore";
import type { SwissProgram } from "#api/tournaments/swiss/SwissProgram";
import { isUuid } from "#api/community/CommunityDeckStore";
import { SealedStore } from "#api/tournaments/sealed/SealedStore";

type Params = {
  app: Express;
  accounts: AccountStore;
  swiss: SwissProgram;
  session: (req: Request) => Promise<AuthSession | undefined>;
};

export function installSealedRoutes({ app, accounts, swiss, session }: Params): void {
  const sealed = new SealedStore(accounts);
  app.get("/tournaments/:id/sealed", async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const auth = await session(req);
    if (!auth) {
      res.status(401).json({ error: "authentication_required" });
      return;
    }
    const tournamentId = String(req.params.id);
    if (!isUuid(tournamentId)) {
      res.sendStatus(404);
      return;
    }
    const own = await sealed.getOwnPool({ tournamentId, accountId: auth.account.id });
    if (!own) {
      res.status(404).json({ error: "sealed_pool_not_found" });
      return;
    }
    res.json(own);
  });
  app.post("/tournaments/:id/sealed/ready", async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    const auth = await session(req);
    if (!auth) {
      res.status(401).json({ error: "authentication_required" });
      return;
    }
    const tournamentId = String(req.params.id);
    const { mainDeck, eggDeck, revision, window } = req.body ?? {};
    if (
      !isUuid(tournamentId) ||
      !Array.isArray(mainDeck) ||
      mainDeck.length !== 40 ||
      !Array.isArray(eggDeck) ||
      eggDeck.length > 5 ||
      ![...mainDeck, ...eggDeck].every((card) => typeof card === "string" && card.length < 100) ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      typeof window !== "string" ||
      window.length > 100
    ) {
      res.status(400).json({ error: "invalid_sealed_deck" });
      return;
    }
    const result = await sealed.ready({
      tournamentId,
      accountId: auth.account.id,
      mainDeck,
      eggDeck,
      revision,
      window,
    });
    if (!result.ok) {
      res.status(409).json({ error: result.reason });
      return;
    }
    if (window === "initial") {
      await swiss.startTournamentProgram(tournamentId);
    }
    res.json(await sealed.getOwnPool({ tournamentId, accountId: auth.account.id }));
  });
}
