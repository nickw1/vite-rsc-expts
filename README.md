# Creating a Vite-based RSC framework

This repo documents a series of experiments to explore the capabilities of [`@vitejs/plugin-rsc`](https://www.npmjs.com/package/@vitejs/plugin-rsc) to produce a simple RSC framework. A prototype framework, with Express integration in mind, has now been completed - though there were a few hurdles along the way!

## Why?

I've been aware of RSCs for some time now, what they are, and how they relate to Server-Side Rendering (SSR) - and have used them in frameworks such as Viktor Lázár's (sadly now archived) excellent [@lazarv/react-server](https://github.com/lazarv/react-server). However I have always treated their detailed, internal workings as something of a black box and I am keen to gain a greater understanding of how they work.

This experiment has also been triggered by `@lazarv/react-server` being archived, which (if it does not resume development) means I may need to explore other alternatives for RSC development.

I could use alternative frameworks to `@lazarv/react-server`, but I thought I would use the opportunity to dive a bit deeper into RSCs and how they work, by creating a basic "framework" from the ground up. The Vite RSC plugin `vite-plugin-rsc` gives a good head start into RSC development, implementing the fundamentals while still allowing you to have a lot of scope in how you design your framework.

Also I have my own ideas about what would make a "perfect" framework for my way of thinking, and I thought it might be fun to attempt to make such a framework happen!

## What framework would I want to build and use?

Having used, or at least played around with, two or three RSC frameworks I have a clear idea in my head as to what would make a good framework for my own preferences. 

One thing I do like about most frameworks is that they offer a filesystem-based router for your RSCs - so I would like to feature that. However one feature of many frameworks is that they often implement their own solutions to such things as middleware or API endpoints, which means extra things to take on board when using the framework. My own preference would be to use a standard server-side router (e.g. Express, Hono) for these - and devote the RSC framework, or micro-framework, to handling the RSCs themselves. 

I'd also want easy access to the request, its URL, and its headers from the RSCs, allowing easy interoperability between the server-side router and RSC handler. Thus, trying to create this would make an interesting challenge to create from the ground up.

I would also obviously want to include server functions (server actions).

So to summarise I'd be looking at a micro-framework containing:

- Filesystem-based router;
- Server functions;
- Easy access to request and header data from the RSCs;
- but with API endpoints, middleware, authentication etc handled by the server-side routing library.

These experiments come in multiple stages, each with their own README as a development log:

1. [Create a basic RSC server](1-basic-vite-rsc-server/README.md), based on Josh Wilson of Aha! Engineering's work.
2. [Create a proof-of-concept for a micro-framework, integrating with Express](2-with-express/README.md).
3. [Creating an installable NPM package of the framework](3-npm-package/README.md) - completed for production mode.
4. [Implementing a dev server](4-with-dev-server/README.md)
5. [Implementing Server Functions](5-with-server-functions/README.md)

## Conclusions

A working prototype framework has now been produced, supporting all the intended features, namely:

- Express integration;
- Simple filesystem router;
- Server Functions;

plus one additonal feature:
- a `refresh()` function and accompanying `useRefresh()` hook, which came about through realisation that I needed an easy way to refresh the component tree if the database contents changed as a result of a Server Action.

### What was difficult and what was easy?

The actual code isn't actually that complex or that lengthy, and much could be derived from the examples on the Vite RSC plugin GitHub repo. The main difficulties all revolved around what I would call import and bundling issue. A particular consideration which came up a lot was the presence of multiple environments and the need to ensure that code was being imported from the correct environment. So for example, appreciating the multiple RSC, SSR and client Vite environments and ensuring that functions imported from the RSC entrypoint (for example) actually ran in the RSC environment.

The other key take-away point, which is absolutely crucial when using any SSR framework, is that imports of SSR-ed components which contain browser APIs at module scope will fail spectacularly. The SSR will try to use the browser APIs, with predictable consequences. Going forward, this will be a very key point to take into account when using third-party APIs... do they support SSR, or will browser APIs at module scope trip things up?

Overall it's been a fun project, and I've gained more insight into the process of working with the Vite RSC plugin and how RSC/SSR actually works.

### What next?

I intend to turn the prototype framework into a more stable library geared specifically at using RSCs from Express, initially, and attempt to port my [lilt](https://github.com/nickw1/lilt) tool to it, given the apparent archiving of my original framework of choice, `@lazarv/react-server`. That is a much bigger application - a lightweight learning environment - and critically, has a range of other dependencies. I can foresee that due to possible module-scope browser APIs as discussed above, problems may arise when using those third-party dependencies but we will see.
