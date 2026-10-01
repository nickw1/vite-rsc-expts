# What is this?

This repo documents a series of experiments to explore the capabilities of [`@vitejs/plugin-rsc`](https://www.npmjs.com/package/@vitejs/plugin-rsc), with the eventual aim (not yet realised) of producing a simple RSC framework.

It's very much a work-in-progress: this document reflects the progress made so far.

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

These experiments come in two stages, each with their own README as a development log:

1. [Create a basic RSC server](1-basic-vite-rsc-server/README.md), based on Josh Wilson of Aha! Engineering's work - completed.
2. [Create a proof-of-concept for a micro-framework, integrating with Express initially](2-with-express/README.md) - started, but still WIP.
