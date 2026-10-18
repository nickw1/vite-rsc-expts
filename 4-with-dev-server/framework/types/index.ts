
import type { Express } from 'express';

export type AppProps = { url: string };

export declare function createDevServer (app: Express) : Promise<((request: Request) => Promise<Response>)>;
export declare function getRequestHandler (app: Express) : Promise<((request: Request) => Promise<Response>)>;