"use client"

import { useState } from "react"
export default function Counter() {
    const [counter, setCounter] = useState(0);

    return (
        <div style={{backgroundColor: '#ffffc0', border: '1px solid black', padding: '8px', margin: '8px'}}>
            <h2>Simple counter (client component)</h2>
            Counter: {counter}
            <button onClick={() => setCounter(counter + 1)}>Increase Counter!</button>
        </div>
    );
}