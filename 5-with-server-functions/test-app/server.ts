import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { createRequest, sendResponse } from '@remix-run/node-fetch-server';

import { getRequestHandler } from 'vite-rsc-example';


const app = express();

app.get(/assets\/.*$/, express.static('dist/client'));

app.get('/api', (req, res) => {

    res.json({ api: true });
});

const handleRequest = await getRequestHandler(app);

app.use('/', async (req: ExpressRequest, res: ExpressResponse) => {
    console.log("/ handler");
    try {
        console.log("trying to handle request. creating request...")
        const request = createRequest(req, res, { host: process.env.HOST });
        console.log("calling handlerequest")
        const response = await handleRequest(request);
        console.log("sending response")
        return sendResponse(res, response);
    } catch (e) {
        console.log("Error in servicing request")
        throw e;
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}.`)
});
