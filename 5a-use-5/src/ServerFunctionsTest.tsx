"use client"

import { useState, useActionState } from "react";
import { testActionWithParam, testActionWithState } from "../actions";

export default function AddSong() {
    const [reply, setReply] = useState("");
    const [counter, setCounter] = useState(1);
    const [state, testActionWithStateEnabled] = useActionState(testActionWithState, { title: "<unknown>", artist: "<unknown>" });


    return (
        <div style={{backgroundColor: '#c0ffc0', border: '1px solid black', padding: '8px', margin: '8px'}}>
            <h2>Server Functions Test</h2>
            <div style={{margin: '4px'}}>
                <button onClick={async () => {
                    const reply = await testActionWithParam(counter);
                    console.log(`Server function replied with : ${reply}`);
                    setReply(reply);
                    setCounter(counter + 1);
                }}>Click to call a server function!</button>
                <br />
                Reply from server function: <strong>{reply}</strong>
            </div>
            <div style={{margin: '4px'}}>
                <form action={testActionWithStateEnabled}>
                    <label htmlFor="title">Title:</label>
                    <br />
                    <input name="title" id="title" />
                    <br />
                    <label htmlFor="artist">Artist:</label>
                    <br />
                    <input name="artist" id="artist" />
                    <br />
                    <input type="submit" value="Go!" />
                </form>
                <br />
                <p>Title and artist returned from server (should be what you entered): {state.title}, {state.artist}</p>
            </div>

        </div>
    );
}
