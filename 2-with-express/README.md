# Stage 2 - Integration with Express

Once I had a basic server up and running, I decided the next thing to do would be to try integrating it with Express.

This was actually quite easy. First of all we build the RSC application for production with a simple `vite build`. What does this produce?

A `dist` directory is generated with subdirectories for `client`, `rsc` and `ssr`. Particularly interesting is the built `index.js` in the `rsc` directory, as this exports a `handleRequest` function as default:

```javascript
//#endregion
//#region framework/entry.rsc.tsx
async function handleRequest(request) {
	let rscStream = renderToReadableStream(/* @__PURE__ */ (0, import_jsx_runtime_react_server.jsx)(App, { url: request.url }));
	console.log("RSC: handleRequest\n==================");
	rscStream = await examineStream(rscStream);
	let htmlStream = await (await (await import("./__vite_rsc_env_imports_manifest.js")).default["framework/entry.ssr.tsx"]()).renderHTML(rscStream);
	console.log("HTML stream with RSC payload injected:");
	htmlStream = await examineStream(htmlStream);
	return new Response(htmlStream, { headers: { "Content-Type": "text/html;charset=utf-8" } });
}
//#endregion
export { handleRequest as default };
```

It's apparent that in an Express server, we should (hopefully) just be able to call this `handleRequest` function and pass in the request. Now we do have an initial (easily resolved) problem: Express uses its own request and response objects, based off the original Node objects, while this exported function uses the Web-standard (fetch API) `Request` and `Response` objects.

So we have to convert between the two. Luckily, a library exists to do this for us: [`@remix-run/node-fetch-server`](https://www.npmjs.com/package/@remix-run/node-fetch-server), which basically allows you to create standards-compliant (fetch API) servers on Node.js, and by extension, Express.

So here is an Express server to hopefully do the job:

```typescript
import express, {  Request as ExpressRequest,  Response as ExpressResponse } from 'express';
import { createRequest, sendResponse } from '@remix-run/node-fetch-server';
import handleRequest from './dist/rsc/index.js';

const app = express();

app.get(/assets\/.*$/, express.static('dist/client'));

app.get('/api', (req, res) => {
    res.json({ api: true });
});

app.use('/', async(req: ExpressRequest, res: ExpressResponse) => {
   const request = createRequest(req, res, { host: process.env.HOST });
   const response = await handleRequest(request);
   return sendResponse(res, response);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}.`)
});
```

What is going on here?

- We first direct any request beginning with `/assets/` to load static files from the `assets` directory in `dist/client`, as this is where the client bundles for our RSC app are stored.

- To demonstrate the fact that we can mix an Express API and an RSC application, I have just created a trivial `/api' route which returns some JSON.

- We then create the top-level route `/`. This is using `@remix-run/node-fetch-server` to create a standard `Request` from the Express request, and pass it on to our `handleRequest` function. The response returned is a standard `Response` object so we convert it back to an Express response with `sendResponse()`.

### Did this work?

The first time I tried this I got this error:

```
Failed to read a RSC payload created by a development version of React on the server
while using a production version on the client. Always use matching versions on the
server and the client.
```

Looking into this, it appears to be due to the development version of React being used by default from the server, but the production version being used on the client when creating the bundle. It can be solved by setting `NODE_ENV` to `production` when running the server, e.g.

```
NODE_ENV=production tsx server.ts
```
if [`tsx`](https://tsx.hirok.io) is used to run the server.

Once this is done, we have a working Express server making use of RSCs! Obviously it's somewhat limited at this point: we haven't implemented a filesystem router for one thing, but more critically, it's only working within the scaffold of its project. What I'm aiming for is a *standalone package installable via `npm`*, which means exploring how to create packages which internally use Vite... please watch this space.

### Exploring the RSC payload

It's interesting at this point, now we're running in production, to inspect the actual RSC payload. (In development mode the payload is complicated by debug info). It consists of a series of entries, each labelled with a number or letter. The `0` entry appears to be the top-level entry, representing the rendered content, and in this example looks like this if we search for David Bowie as our artist:

```
1:I["cb43d5ae5794",[],"default",1]
0:["$","html",null,{"children":[["$","head",null,{"children":["$","title",null,
{"children":"RSC"}]}],["$","body",null,{"children":[["$","h1",null,{"children":
"React Server Component!"}],["$","$L1",null,{}],["$","h2",null,{"children":["Songs by
 ","David Bowie"]}],["$","div",null,{"children":[["$","p","song296",{"children":
 ["Space Oddity"," by ","David Bowie",", year ",1975]}],["$","p","song380",
 {"children":["Ashes to Ashes"," by ","David Bowie",", year ",1980]}],["$","p",
 "song435",{"children":["Lets Dance"," by ","David Bowie",", year ",1983]}]]}]]}]]}]
```

We have two entries, `0` and `1`.
Clearly the main entry, `0`, is a nested representation of the rendered elements. It's interesting to look at the entry for the `Counter` client component, which appears to have a blank object for its content (as it is rendered later, by SSR) and `$L1` in the position where the HTML element would go:

```
["$","$L1",null,{}]
```

It's of note that there is no official spec for the RSC payload, see [Dan Abramov's article](https://overreacted.io/introducing-rsc-explorer/). Nonetheless you can get some insight into what's going on from the above.

According to Dan Abramov, the `1` in `$L1` is a reference to entry `1` in the payload. We can see entry `1` looks like this:

```
1:I["cb43d5ae5794",[],"default",1]
```
it's labelled `I` (import?) and refers to `cb43d5ae5794`, which is presumably a reference to the `Counter` client component and `default`, from what I understand from the article, means use the default export from the module.


## What if the root component was a client component?

One question I asked myself is, what would be returned if the `index.tsx` of the `src` folder, i.e. the "RSC", was a client
component? I tried this out by saving the counter component as `index.tsx` in `src` and examining the output. The RSC entry point produced this:

```
1:I["0b5adbfe7b36",[],"default",1]
0:["$","$L1",null,{"url":"http://localhost:3000/"}]
```

The SSR produced this output. Firstly the HTML stream before injection of RSC payload:

```html
<link rel="modulepreload" href="/assets/entry.rsc-rmJulbGQ.js" crossorigin="" 
fetchPriority="low"/><link rel="modulepreload" href="/assets/index-C0NJsBYt.js" 
crossorigin=""/><div>Counter: <!-- -->0<button>Increase Counter!</button>
</div><script id="_R_">import("/assets/index-C0NJsBYt.js")</script>
```

Secondly the HTML stream with the RSC payload injected:
```html
<link rel="modulepreload" href="/assets/entry.rsc-rmJulbGQ.js" crossorigin="" 
fetchPriority="low"/><link rel="modulepreload" href="/assets/index-C0NJsBYt.js" 
crossorigin=""/><div>Counter: <!-- -->0<button>Increase Counter!</button><div>
<script id="_R_">import("/assets/index-C0NJsBYt.js")</script>
<script>(self.__FLIGHT_DATA||=[]).push("1:I[\"0b5adbfe7b36\",[],
\"default\",1]\n0:[\"$\",\"$L1\",null,{\"url\":\"http://localhost:3000/\"}]\n")
</script>
```

If you look at this, you can see the same sequence of events occurs even if the root component is a client component.
The RSC entry point receives the request, but rather than trying to render the JSX directly, it creates a payload merely with a 
*reference* to the client component. (`0b5adbfe7b36` here).

The SSR then generates non-interactive HTML from the payload and injects the payload into it, to be hydrated on the client,
as before.
