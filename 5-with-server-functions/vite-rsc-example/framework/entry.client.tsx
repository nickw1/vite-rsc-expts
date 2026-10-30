import { use, type ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';


import { rscStream } from 'rsc-html-stream/client';
import type { ReturnValue } from './types';
import { setRoot } from 'vite-rsc-example/client';
import * as ReactClient from '@vitejs/plugin-rsc/browser';


const jsx = ReactClient.createFromReadableStream<ReactNode>(rscStream);

function ClientRoot() {
    return use(jsx);
}



const root = hydrateRoot(
    document,
    <ClientRoot />
);

setRoot(root);

// Based on the @vitejs/plugin-rsc example at:
// https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-rsc/examples/basic/src/framework/entry.browser.tsx

ReactClient.setServerCallback(async (id, args) => {
    console.log(`client: Detected server action request: ID is ${id}`);
    const url = new URL(window.location.href);
    url.pathname += "_.rsc";
    const action = {
        id,
        body: await ReactClient.encodeReply(args)
    };
    const headers = new Headers();
    headers.set('x-rsc-action', action.id);
    const renderRequest = new Request(url.toString(), {
        headers,
        method: 'POST',
        body: action.body
    });
    console.log("Headers of created request:");
    console.log(renderRequest.headers);
    const payload = await ReactClient.createFromFetch<ReturnValue>(fetch(renderRequest));
    const { ok, data } = payload;
    if (!ok) throw data;
    return data;
});
