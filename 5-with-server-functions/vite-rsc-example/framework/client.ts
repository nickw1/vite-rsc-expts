// A placeholder for any client-only functions we want to export from the package.
// Exporting client-only functions with the main export means clients then end up importing server-side code, which causes problems.


import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Root } from 'react-dom/client';
import * as ReactClient from '@vitejs/plugin-rsc/browser';


let root: Root | null = null;

export function setRoot(rootIn: Root) {
    root = rootIn;
}

export async function refresh() {
    console.log(`client: fetching ${window.location.href}`);

    try {
        if (root !== null) {
            const tree = await ReactClient.createFromFetch<ReactNode>(fetch(window.location.href, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'x-no-ssr': '1'
                }
            }));
            console.log('Got tree');
            root.render(tree);
            console.log('Tree rendered');

        } else {
            console.log("cannot render tree - root is null");
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
