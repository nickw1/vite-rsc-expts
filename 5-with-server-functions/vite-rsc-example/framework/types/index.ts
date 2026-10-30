
import type { Express } from 'express';
import { ReactElement } from 'react';

export type AppProps = { url: string };
export type RscPayload = { root: ReactElement, data?: any };
export type ReturnValue = { ok: boolean, data: unknown }

export declare function createDevServer (app: Express) : Promise<((request: Request) => Promise<Response>)>;
export declare function getRequestHandler (app: Express) : Promise<((request: Request) => Promise<Response>)>;