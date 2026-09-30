# Stage 1 - Create a basic vite-rsc-plugin based RSC server

The first thing I did was to recreate the simple RSC server. 

This is based on the excellent [article by Josh Wilson of Aha! Engineering](https://www.aha.io/engineering/articles/why-we-rolled-our-own-rsc-framework), with one or two tweaks.

As this maybe useful to other people wishing to build things with RSC, I have done a full documentation of my experiments, including any mistakes along the way! Josh Wilson's article includes many of these explanations, and often in more depth, but I wanted to try out a few extra things myself so the development log below may be of interest.

## Creating a working React Server Component which is served by the Vite dev server

The first stage was simply to create a single RSC which is served successfully by the Vite dev server.
The example uses Josh Wilson's article as a starting point, though the client entry point is not implemented just yet. Thus we begin with a `vite.config.ts` as follows:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import rsc from '@vitejs/plugin-rsc';

export default defineConfig({
    plugins: [
        react(),
        rsc({
            entries: {
                rsc:'./framework/entry.rsc.jsx',
                ssr: './framework/entry.ssr.jsx'
            }
        })
    ],
    build: {
        minify: false
    }
})
```

Note the insertion of the `rsc` plugin and its `entries` option which specifies the entry points for the different modes: RSC and server-side rendering thus far (no client just yet).

### The RSC entry

Moving onto the RSC entry point. Again this is very much taken from Josh Wilson's example, with one or two tweaks.

```typescript
import * as ReactServer from '@vitejs/plugin-rsc/rsc';
import App from '../src'; //  index.tsx omitted in the standard way
import examineStream from './utils/examineStream';

export default async function handleRequest(request: Request): Promise<Response> {
    // Convert RSC JSX to RSC payload
    // This "framework" assumes that the RSC component is in the src directory and named index.jsx
    let rscStream = ReactServer.renderToReadableStream(
        <App request={request} />
    )

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
    htmlStream = await examineStream(htmlStream);


    return new Response(htmlStream, {
        headers: {
            'Content-Type': 'text/html;charset=utf-8'
        }
    });
}
```

So the RSC entry point is an async function which takes in an incoming `Request` and resolves with a `Response` - all very logical. Looking at it we:

- call the `renderToReadableStream()` method of `ReactServer` (part of the Vite RSC plugin). This takes JSX representing an RSC and generates the standard RSC payload. Note how I have created a function `examineStream()` - this is to examine the contents of any created stream, purely for curiosity, so we can see the actual RSC payload logged on the console. Note also how I have attempted to adopt the style of many frameworks
by saving the RSC to be rendered as `index.tsx` in the project's `src` directory. Obviously we cannot handle multiple RSCs or alternate entry points yet... but that will come!

- import the SSR entry point to actually render the RSC payload to HTML. Thus, the React Server Component is employing Server Side Rendering to render itself as HTML. A frequent point of confusion if you are new to this is that RSC and SSR are the same thing - they are not. As we will see, client components typically also employ SSR to render the JSX to HTML on the server so that the user immediately sees the page's HTML - rather than a blank page -  when the response is returned. But only RSCs can actually execute custom server-side code within the React component itself.

- I have used `examineStream()` again just to prove that what we get back from the SSR is HTML.

- The HTML is then sent back within a standard `Response`.

### The SSR entry

Moving on then to the SSR entry point, this is as follows:

```typescript
import { use, type ReactNode } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import * as ReactClient from '@vitejs/plugin-rsc/ssr';

// Renders a given RSC stream using SSR

export async function renderHTML(rscStream: ReadableStream) {

    let jsx: Promise<ReactNode> | undefined;
    // We need to create a React component for the purposes of rendering our RSC payload as HTML
    function SsrRoot() {
        jsx ??= ReactClient.createFromReadableStream(rscStream);
        return use(jsx);
    }
    const htmlStream = await renderToReadableStream(<SsrRoot />);

    return htmlStream;
}
```

Currently this is very simple, because it doesn't have to deal with client components yet. It takes in a `ReadableStream` (so far, this can only be an RSC payload) and then creates a temporary React component to perform the conversion to HTML. We create JSX from the payload using `ReactClient.createFromReadableStream()` (again part of the Vite RSC plugin). `jsx` is actually a promise which resolves with a `ReactNode` representing the JSX: React's `use()` API takes this promise and generates a component dynamically from the JSX once it's been resolved.

We then use `react-dom`'s `renderToReadableStream()` to perform Server-Side Rendering of the JSX to HTML, and return the stream generated. As we have seen, the RSC entry point then sends back a `Response` containing this stream.

### Finally - the example React Server Component

The one thing we haven't seen yet is the example RSC, which the "framework" assumes is named `index.tsx` in the project's `src` directory. This RSC queries a server-side database to prove that it is actually operating as an RSC:

```typescript
import Database from "better-sqlite3";
import type { AppProps } from '../framework/types';

type Song = { title: string, artist: string, year: number };

export default function App({ request }: AppProps) {
    const url = new URL(request.url);
    const artist = url.searchParams.get("artist");
    const db = new Database("./wadsongs.db");
    const stmt = artist ? db.prepare("SELECT * FROM wadsongs WHERE artist=?") : db.prepare("SELECT * FROM wadsongs");
    const results = (artist ? stmt.all(artist) : stmt.all()) as Song[];
    const output = results.map((song: Song) => <p>{song.title} by {song.artist}, year {song.year}</p>);
    return (
        <html>
            <head>
                <title>RSC</title>
            </head>
            <body>
                <h1>React Server Component!</h1>
                <p>Current working directory: <strong>{process.cwd()}</strong></p>
                <p>Request URL was: <strong>{request.url}</strong></p>
                <h2>Songs by {artist || "all artists"}</h2>
                <div>{output}</div>
            </body>
        </html>
    );
}
```
So it's using `better-sqlite3` to query an SQLite database (provided) containing all the UK number ones from 1960 to 2015. It takes a `Request` object as a prop (**EDIT - this will later prove to be a mistake, keep reading**) so we can easily read the request information, and then obtains a query string in the standard manner by creating a `URL` object and reading its `URLSearchParams`.

We then perform a query of the database using the `artist` query string parameter (if it exists) to find all songs by that artist, or simply all songs if the parameter isn't provided. Finally we map the results to JSX and render them.

This currently works! So essentially we have a working RSC environment with very little code, thanks to `@vitejs/plugin-rsc`.

Of course it will not deal with client components yet, and we can only render one RSC.

### First problem - the RSC payload was huge!

While the above worked, examining the payload revealed it to be absolutely huge in size, containing apparently large amounts of unfamiliar JavaScript code. A bit of reading up on this (e.g. see [this Vercel article](https://vercel.com/kb/guide/how-to-optimize-rsc-payload-size)) suggests that the issue was the `Request` object being passed as a prop to the RSC and everything in `Request` is then serialised into the payload!

So passing in `Request` as a prop was clearly not such a great idea - and certainly explains why other frameworks do not do it! Now the component just receives the URL as a prop - as time goes on, other relevant information will also be passed in.

## Stage 2. Supporting client components

The next stage was then to support client components. The time-honoured counter component will be used as a proof-of-concept:

```tsx
"use client"

import { useState } from "react"
export default function Counter() {
    const [counter, setCounter] = useState(0);

    return (
        <div>
            Counter: {counter}
            <button onClick={() => setCounter(counter + 1)}>Increase Counter!</button>
        </div>
    );
}
```

The RSC was updated thus, to include the `Counter` component within it:

```tsx
import Database from "better-sqlite3";
import type { AppProps } from '../framework/types';

import Counter from './Counter';

type Song = { id: number, title: string, artist: string, year: number };

export default function App({ url }: AppProps) {
    const urlObj = new URL(url);
    const artist = urlObj.searchParams.get("artist");
    const db = new Database("./wadsongs.db");
    const stmt = artist ? db.prepare("SELECT * FROM wadsongs WHERE artist=?") : db.prepare("SELECT * FROM wadsongs");
    const results = (artist ? stmt.all(artist) : stmt.all()) as Song[];
    const output = results.map((song: Song) => <p key={`song${song.id}`}>{song.title} by {song.artist}, year {song.year}</p>);
    
    return (
        <html>
            <head>
                <title>RSC</title>
            </head>
            <body>
                <h1>React Server Component!</h1>
                <Counter />
                <h2>Songs by {artist || "all artists"}</h2>
                <div>{output}</div>
            </body>
        </html>
    );
}
```
Testing this revealed that the `Counter` component was indeed rendered, but predictably, it wasn't interactive because we've just rendered the static HTML. We have not performed hydration to populate the React DOM client-side, attach event listeners and generally make it interactive.

### Exploring the RSC payload

It's interesting to inspect the actual RSC payload. It consists of a series of entries, each labelled with a number or letter. The `0` entry appears to be the top-level entry, representing the rendered content, and in this example looks like this if we search for David Bowie as our artist:

```
0:["$","html",null,{"children":[["$","head",null,{"children":["$","title",null,{"children":"RSC"},"$1","$5",1]},"$1","$4",1],
["$","body",null,{"children":[["$","h1",null,{"children":"React Server Component!"},"$1","$7",1],
["$","$La",null,{},"$1","$8",1],["$","h2",null,{"children":["Songs by ","David Bowie"]},"$1","$b",1],
["$","div",null,{"children":[["$","p","song296",{"children":["Space Oddity"," by ","David Bowie",", year ",1975]},"$1","$d",0],
["$","p","song380",{"children":["Ashes to Ashes"," by ","David Bowie",", year ",1980]},"$1","$e",0],
["$","p","song435",{"children":["Lets Dance"," by ","David Bowie",", year ",1983]},"$1","$f",0]]},"$1","$c",1]]},"$1","$6",1]]},
#"$1","$3",1]
```

Clearly this is a nested representation of the rendered elements. It's interesting to look at the entry for the `Counter` client component, which appears to have a blank object for its content (as it is rendered later, by SSR) and `$La` in the position where the HTML element would go:

```
["$","$La",null,{},"$1","$8",1]
```

It's of note that there is no official spec for the RSC payload, see [Dan Abramov's article](https://overreacted.io/introducing-rsc-explorer/). Nonetheless you can get some insight into what's going on from the above.

According to Dan Abramov, the `a` in `$La` is a reference to entry `a` in the payload, so entry `a` clearly represents the `Counter` component. If we look at the payload, there is an entry labelled `a`:
```
a:I["$9",[],"default",1]
```
it's labelled `I` (import?) and refers to `$9`, which, by similar logic, is entry `9` in the payload. Entry `9` in the payload refers to the source of the `Counter` module and `default`, from what I understand from the article, means use the default export from the module.

```
9:"/src/Counter.tsx"
```
You can see that the `Counter` component is not being serialised at this stage: it happens later, at the SSR stage. The payload merely includes the reference to the counter component.

### Implementing client handling

With all that, it's time to move on to implementing the client-side process of hydrating the client components. At the moment, the SSR entry point is rendering client components as HTML, and sending them back to the client. However this is not "live" HTML - it's pure content, with no interactivity added. To add interactivity, the client needs to receive a representation of the React DOM which can be loaded into memory with event handlers, etc, attached. Pre-RSC, this was done by a further request to the server, but with RSC we don't have to do that. Given we already have the RSC payload, which represents the document, we can just send that on to the client from the SSR entrypoint - no need for another round trip to the server.

Returning to Josh Wilson's article, here is the modified SSR entry point:

```tsx
import { use, type ReactNode } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import * as ReactClient from '@vitejs/plugin-rsc/ssr';
import { injectRSCPayload } from 'rsc-html-stream/server';
import examineStream from './utils/examineStream';

// Renders a given RSC stream using SSR

export async function renderHTML(rscStream: ReadableStream) {

    const [rscStream1, rscStream2] = rscStream.tee(); // NEW
    rscStream = rscStream1;

    let jsx: Promise<ReactNode> | undefined;
    // We need to create a React component for the purposes of rendering our RSC payload as HTML
    function SsrRoot() {
        jsx ??= ReactClient.createFromReadableStream(rscStream);
        return use(jsx);
    }

    let htmlStream : ReadableStream = await renderToReadableStream(<SsrRoot />, {
       bootstrapScriptContent: `import(${JSON.stringify(ReactClient.getClientEntryUrl())})` // NEW
    });

    console.log('\nHTML stream before injection of RSC payload:');
    htmlStream = await examineStream(htmlStream);

    // NEW
    const htmlStreamWithPayload = htmlStream.pipeThrough(
        injectRSCPayload(rscStream2)
    )
    
    return htmlStreamWithPayload;
}
```
Note the new sections:

- Firstly, we `tee` (split) the stream. One branch wil be used to render the HTML server side within the SSR from the payload (as before) while the other, `rscStream2`, will be used to inject the RSC payload into the HTML thus generated, so it can be used by the client.
- Note how, when we render the HTML with SSR via `renderToReadableStream()`, we now specify the `bootstrapScriptContent`. This is provided by `@vitejs/plugin-rsc` and contains the client-side code to construct the React DOM from the RSC payload sent back to the client and deal with hydration.
- Note also how we inject the RSC payload into our HTML stream. This is done with the `rsc-stream-html` third-party package to do this. The RSC payload will be added to our HTML as JavaScript and the combined HTML/RSC payload sent back to the client.

### The actual client entry point

The client entry point is then simple:

```typescript
import { use, type ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import * as ReactClient from '@vitejs/plugin-rsc/browser';
import { rscStream } from 'rsc-html-stream/client';


const jsx = ReactClient.createFromReadableStream<ReactNode>(rscStream);

function ClientRoot() {
    return use(jsx);
}

hydrateRoot(
    document,
    <ClientRoot />
);
```

We read the HTML (with RSC payload) from the server, obtaining it from `rsc-html-stream` which we use above. Like in SSR, we then need to create a temporary React component (`<ClientRoot>`). We perform the hydration with `hydrateRoot()` from `react-dom` which will perform the hydration, loading in the React document into React DOM and attaching interactivity to it.

The exact contents of the stream returned from the SSR entry point to the client is as follows:

```html
<!DOCTYPE html><html><head><title>RSC</title></head><body><h1>React Server Component!</h1><div>Counter: <!-- -->0
<button>Increase Counter!</button></div><h2>Songs by <!-- -->David Bowie</h2><div><p>Space Oddity<!-- --> by
 <!-- -->David Bowie<!-- -->, year <!-- -->1975</p><p>Ashes to Ashes<!-- --> by <!-- -->David Bowie<!-- -->,
year <!-- -->1980</p><p>Lets Dance<!-- --> by <!-- -->David Bowie<!-- -->, year <!-- -->1983</p></div>
<script id="_R_">import("/@id/__x00__virtual:vite-rsc/entry-browser")</script>

<script>(self.__FLIGHT_DATA||=[]).push("[...the RSC payload...]")</script>
</body></html>
```

You can hopefully see here that there is non-interactive, server-generated HTML content but also the payload injected as JavaScript. You can also see the injected React bootstrap script: 

```html
<script id="_R_">import("/@id/__x00__virtual:vite-rsc/entry-browser")</script>
```
This will load the payload and using it, perform hydration so that we end up with a properly interactive page.

## What if the root component was a client component?

One question I asked myself is, what would be returned if the `index.tsx` of the `src` folder, i.e. the "RSC", was a client
component? I tried this out by saving the counter component as `index.tsx` in `src` and examining the output. The RSC entry point produced this:

```
2:"/src/index.tsx$$cache=r94qbph4pc"
3:I["$2",[],"default",1]
:N1790772602748.376
0:["$","$L3",null,{"url":"http://localhost:5173/favicon.ico"},null,"$1",0]
```

The SSR produced this output. Firstly the HTML stream before injection of RSC payload:
```html
<div>Counter: <!-- -->0<button>Increase Counter!</button></div><script id="_R_">
import("/@id/__x00__virtual:vite-rsc/entry-browser")
</script>
```

Secondly the HTML stream with the RSC payload injected:
```html
<div>Counter: <!-- -->0<button>Increase Counter!</button></div>
<script id="_R_">import("/@id/__x00__virtual:vite-rsc/entry-browser")</script>
<script>(self.__FLIGHT_DATA||=[]).push("2:\"/src/index.tsx$$cache=r94qbph4pc\"\n
3:I[\"$2\",[],\"default\",1]\n:N1790772602748.376\n1:[[\"handleRequest\",\"/home/nick/src/vitersc-basic/framework/entry.rsc.tsx\",
17,79,14,1,false]]\n0:[\"$\",\"$L3\",null,{\"url\":\"http://localhost:5173/favicon.ico\"},null,\"$1\",0]\n")</script>
</body></html>
```

If you look at this, you can see the same sequence of events occurs even if the root component is a client component.
The RSC entry point receives the request, but rather than trying to render the JSX directly, it creates a payload merely with a 
*reference* to the client component (entry 3, referenced from entry 2).
The SSR then generates non-interactive HTML from the payload and injects the payload into it, to be hydrated on the client,
as before.


