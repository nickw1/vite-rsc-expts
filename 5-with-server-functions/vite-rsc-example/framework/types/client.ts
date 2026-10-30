// A placeholder for type definitions for functions in client.ts.

import type { Root } from 'react-dom/client';
export declare function refresh(): Promise<void>;
export declare function useRefresh<T>(dependencies?: Array<T>, callback?: () => void) : void;

export declare function setRoot(rootIn: Root) : void;