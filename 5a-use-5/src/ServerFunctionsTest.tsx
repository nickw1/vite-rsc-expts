"use client"

import { useState, useActionState, useEffect } from "react";
import { testActionWithParam, testActionWithState, addSong } from "../actions";
import { refresh, useRefresh } from "vite-rsc-example/client";

export default function ServerFunctionsTest() {
    const [reply, setReply] = useState("");
    const [counter, setCounter] = useState(1);
    const [state, testActionWithStateEnabled] = useActionState(testActionWithState, { message: "<unknown>" });
    const [addSongState, addSongWithState] = useActionState(addSong, { id: 0 as number | bigint });

    useRefresh([addSongState.id]);

 //   const [addSongState, setAddSongState] = useState({id: 0 as number | bigint});
    return (
        <div style={{ backgroundColor: '#c0ffc0', border: '1px solid black', padding: '8px', margin: '8px' }}>
            <h2>Server Functions Tests</h2>
            <h3>Simple server function with parameter</h3>
            <div style={{ margin: '4px' }}>
                <button onClick={async () => {
                    const reply = await testActionWithParam(counter);
                    console.log(`Server function replied with : ${reply}`);
                    setReply(reply);
                    setCounter(counter + 1);
                }}>Click to call a server function!</button>
                <br />
                Reply from server function: <strong>{reply}</strong>
            </div>
            <h3>Action state</h3>
            <div style={{ margin: '4px' }}>
                <form action={testActionWithStateEnabled}>
                    <label htmlFor="message">Message:</label>
                    <br />
                    <input name="message" id="message" />
                    <br />
                    <input type="submit" value="Go!" />
                </form>
                <br />
                <p>Message received (should be what you entered): {state.message}</p>
            </div>
            <h3>Adding to a database with auto-refresh</h3>
            <div style={{ margin: '4px' }}>
                <form action={addSongWithState}>
                    <label htmlFor="title">Title:</label>
                    <br />
                    <input name="title" id="title" />
                    <br />
                    <label htmlFor="artist">Artist:</label>
                    <br />
                    <input name="artist" id="artist" />
                    <br />
                    <label htmlFor="year">Year:</label>
                    <br />
                    <input name="year" id="year" />
                    <br />
                    <input type="submit" value="Go!" />
                </form>
                <br />
                <p> {addSongState.id > 0 ? `Allocated ID: ${addSongState.id}` : ""}</p>
            </div>
            <div>
            <button onClick={() => { refresh() }}>Click to refresh...</button>
            </div>
        </div>
    );
}