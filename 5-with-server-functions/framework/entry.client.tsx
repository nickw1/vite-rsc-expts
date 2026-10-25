import { use, type ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as ReactClient from '@vitejs/plugin-rsc/browser';
import { rscStream } from 'rsc-html-stream/client';
import type { ReturnValue } from './types';


const [str1, ] = rscStream.tee();


const jsx = ReactClient.createFromReadableStream<ReactNode>(str1);

function ClientRoot() {
    return use(jsx);
}

hydrateRoot(
    document,
    <ClientRoot />
);


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
    //setPayload(payload); // store payload in state, not sure why needed
    const { ok, data } = payload;
    if (!ok) throw data;
    return data;
});