// A placeholder for type definitions for functions in client.ts.

export declare function refresh(): Promise<void>;
export declare function useRefresh<T>(dependencies?: Array<T>, postRefreshCallback?: () => void) : void;

export declare function setCallback(cb: () => Promise<void>) :  Promise<void>;