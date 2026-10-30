
import Database from "better-sqlite3";
import type { AppProps } from 'vite-rsc-example/types';

import Counter from './Counter';
import ServerFunctionsTest from './ServerFunctionsTest';

type Song = { id: number, title: string, artist: string, year: number };

export default function App({ url }: AppProps) {

    console.log(process.cwd());
    console.log(`URL is ${url}`)
    const urlObj = new URL(url);
    const artist = urlObj.searchParams.get("artist");
    const db = new Database("./wadsongs.db");
    const stmt = artist ? db.prepare("SELECT * FROM wadsongs WHERE artist=?") : db.prepare("SELECT * FROM wadsongs");
    const results = (artist ? stmt.all(artist) : stmt.all()) as Song[];
    const output = results.map((song: Song, index: number) => <tr key={`song${song.id}`} style={{backgroundColor: index % 2 ? '#c0c0ff' : '#ffc0c0'}}><td>{song.title}</td><td>{song.artist}</td><td>{song.year}</td></tr>);
    
    return (
        <html>
            <head>
                <title>RSC</title>
            </head>
            <body>
                <h1>This is a React Server Component</h1>
                <Counter />
                <ServerFunctionsTest />
                <h2>Songs by {artist || "all artists"}</h2>
                <div><table><thead><tr><th>Title</th><th>Artist</th><th>Year</th></tr></thead><tbody>{output}</tbody></table></div>
            </body>
        </html>
    );
}


