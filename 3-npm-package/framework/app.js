#!/usr/bin/env node
import path from 'node:path';
import { createBuilder } from "vite";


const builder = await createBuilder({
    root: process.cwd(),
    configFile : path.resolve(process.cwd(), "vite.config.mjs")
});
await builder.buildApp();
