// A placeholder for type definitions for functions in client.ts.


export declare function refresh(): Promise<void>;
export declare function useRefresh<T>(dependencies?: Array<T>, callback?: () => void) : void;

export type Callback = (callback: Promise<Response>) => Promise<void>;

export declare function setCallback(callbackIn: Callback) : void;