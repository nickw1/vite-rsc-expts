// A placeholder for any client-only functions we want to export from the package.
// Exporting client-only functions with the main export means clients then end up importing server-side code, which causes problems.


import { useEffect } from 'react';
import type { Callback } from './types/client';

let callback: Callback | null = null;


export function setCallback(callbackIn: Callback) {
    console.log("Setting root in setCallback()");
    callback = callbackIn;
}

export async function refresh() {
    console.log(`client: fetching ${window.location.href}`);

    try {
        if (callback !== null) {
            await callback(fetch(window.location.href, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-no-ssr': '1'
                }
            }));
            console.log("callback has completed");
        } else {
            console.log("callback cannot call - is null");
        }
    } catch (e) {
        console.error('refresh(): Error', e);
    }
}

export function useRefresh<T>(dependencies?: Array<T>, callback?: () => void) {
    useEffect(() => {
        (async () => {
            await refresh();
            callback?.();
        })();
    }, dependencies);
}
