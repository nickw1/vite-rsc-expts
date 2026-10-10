#!/usr/bin/env node
import path from 'node:path';
import { createBuilder } from "vite";


console.log("Vite build with dirname is:")
console.log(path.resolve(import.meta.dirname, '../vite.config.mjs'));
console.log("Vite build with cwd is:")
console.log(path.resolve(process.cwd(), '../vite.config.mjs'));

const builder = await createBuilder({
    root: process.cwd(),
    configFile : path.resolve(process.cwd(), "vite.config.mjs")
   // configFile: path.resolve(import.meta.dirname, "../vite.config.mjs")
});
await builder.buildApp();
