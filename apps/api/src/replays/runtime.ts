import { accountStore } from "../accounts/runtime.js";
import { ReplayLibrary } from "./ReplayLibrary.js";
import { S3ReplayStorage } from "./storage.js";

export const replayLibrary = new ReplayLibrary(accountStore, S3ReplayStorage.fromEnvironment());
