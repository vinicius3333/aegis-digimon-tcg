import express, { type Express } from "express";
import { AccountStore } from "../dist/accounts/AccountStore.js";
import { installAccountRoutes } from "../dist/accounts/routes.js";
import { installMatchQueueRoutes } from "../dist/matchmaking/installMatchQueueRoutes.js";

export function createBrowserHttpApp(): { app: Express; close: () => Promise<void> } {
  const app = express();
  const accounts = new AccountStore({});
  app.use(express.json());
  installAccountRoutes(app, accounts);
  installMatchQueueRoutes({ app });
  return { app, close: () => accounts.close() };
}
