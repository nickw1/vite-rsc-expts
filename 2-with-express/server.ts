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
