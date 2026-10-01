import * as ReactServer from '@vitejs/plugin-rsc/rsc';
import App from '../src/';
import examineStream from './utils/examineStream';

export default async function handleRequest(request: Request): Promise<Response> {

    console.log("RSC\n===\n");
    
    // Convert RSC JSX to RSC payload
    // This "framework" assumes that the RSC component is in the src directory and named index.jsx
    let rscStream = ReactServer.renderToReadableStream(
        <App url={request.url} />
    );

    const ssrEntryModule = await import.meta.viteRsc.import<
        typeof import('./entry.ssr.tsx')
    >(
        './entry.ssr.tsx', { environment: 'ssr' }
    );

    // Render the RSC stream to the HTML using the SSR module (i.e. server-side rendering)
    let htmlStream = await ssrEntryModule.renderHTML(rscStream) as ReadableStream;



    return new Response(htmlStream, {
        headers: {
            'Content-Type': 'text/html;charset=utf-8'
        }
    });
}
