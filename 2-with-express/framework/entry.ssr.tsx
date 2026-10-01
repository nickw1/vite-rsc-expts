import { use, type ReactNode } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import * as ReactClient from '@vitejs/plugin-rsc/ssr';
import { injectRSCPayload } from 'rsc-html-stream/server';
import examineStream from './utils/examineStream';

// Renders a given RSC stream using SSR

export async function renderHTML(rscStream: ReadableStream) {

    console.log("SSR\n===\n");
    
    const [rscStream1, rscStream2] = rscStream.tee();
    rscStream = rscStream1;

    let jsx: Promise<ReactNode> | undefined;
    // We need to create a React component for the purposes of rendering our RSC payload as HTML
    function SsrRoot() {
        jsx ??= ReactClient.createFromReadableStream(rscStream);
        return use(jsx);
    }

    let htmlStream : ReadableStream = await renderToReadableStream(<SsrRoot />, {
       bootstrapScriptContent: `import(${JSON.stringify(ReactClient.getClientEntryUrl())})`
    });

    const htmlStreamWithPayload = htmlStream.pipeThrough(
        injectRSCPayload(rscStream2)
    )
        

    return htmlStreamWithPayload;
}