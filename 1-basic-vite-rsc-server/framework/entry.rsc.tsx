import * as ReactServer from '@vitejs/plugin-rsc/rsc';
import App from '../src/';
import examineStream from './utils/examineStream';

export default async function handleRequest(request: Request): Promise<Response> {
    // Convert RSC JSX to RSC payload
    // This "framework" assumes that the RSC component is in the src directory and named index.jsx
    let rscStream = ReactServer.renderToReadableStream(
        <App url={request.url} />
    );

    console.log("RSC: handleRequest\n==================");

    // Tees the stream so we can examine it. Did this to get an understanding of what an RSC payload looks like
    rscStream = await examineStream(rscStream);

    const ssrEntryModule = await import.meta.viteRsc.import<
        typeof import('./entry.ssr.tsx')
    >(
        './entry.ssr.tsx', { environment: 'ssr' }
    );

    // Render the RSC stream to the HTML using the SSR module (i.e. server-side rendering)
    let htmlStream = await ssrEntryModule.renderHTML(rscStream) as ReadableStream;

    // Prove that what we get back is HTML
    console.log('HTML stream with RSC payload injected:');
    htmlStream = await examineStream(htmlStream);


    return new Response(htmlStream, {
        headers: {
            'Content-Type': 'text/html;charset=utf-8'
        }
    });
}
