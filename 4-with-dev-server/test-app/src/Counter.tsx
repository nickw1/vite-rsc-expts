"use client"

import { useState } from "react"
export default function Counter() {
    const [counter, setCounter] = useState(0);

    return (
        <div>
            Counter: {counter}
            <button onClick={() => setCounter(counter + 1)}>Increase Counter!</button>
        </div>
    );
}