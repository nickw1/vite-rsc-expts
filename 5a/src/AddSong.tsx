"use client"

import { useState, useActionState } from "react";
import { testAction, testActionWithParam, testActionWithState } from "../actions";

export default function AddSong() {
    const [reply, setReply] = useState("");
    const [counter, setCounter] = useState(1);
    const [state, testActionWithStateEnabled] = useActionState(testActionWithState, { name: "<unknown>" });

    
    return (
        <div>
            <div>
                <button onClick={async () => {
                    const reply = await testActionWithParam(counter);
                    console.log(`Action replied with : ${reply}`);
                    setReply(reply);
                    setCounter(counter + 1);
                }}>Click to call an action!</button>
                <br />
                Reply from action: <strong>{reply}</strong>
            </div>
            <div>
                <form action={testActionWithStateEnabled}>
                    <label htmlFor="name">Name: <input name="name" /></label>
                    <input type="submit" value="Go!" />
                </form>
                <br />
                <p>Name returned from server (should be what you entered): {state.name}</p>
            </div>
            
        </div>
    );
}

/*
<div>
                <form method="post" action={testActionWithStateEnabled}>
                    <label htmlFor="name">Name: <input name="name" /></label>
                    <input type="submit" value="Go!" />
                </form>
                <br />
                <p>Name returned from server (should be what you entered): {state.name}</p>
            </div>
            */