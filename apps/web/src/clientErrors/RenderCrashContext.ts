import { createContext } from "react";

export type RenderCrash = { crashed: boolean };

export const RenderCrashContext = createContext<RenderCrash>({ crashed: false });
