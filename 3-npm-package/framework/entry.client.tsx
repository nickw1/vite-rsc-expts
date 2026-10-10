import { use, type ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as ReactClient from '@vitejs/plugin-rsc/browser';
import { rscStream } from 'rsc-html-stream/client';


const [str1, str2] = rscStream.tee();


const jsx = ReactClient.createFromReadableStream<ReactNode>(str1);

function ClientRoot() {
    return use(jsx);
}

hydrateRoot(
    document,
    <ClientRoot />
);