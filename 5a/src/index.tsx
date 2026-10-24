
import Database from "better-sqlite3";
import type { AppProps } from 'vite-rsc-example/types';

import Counter from './Counter';
import AddSong from './AddSong';

type Song = { id: number, title: string, artist: string, year: number };

export default function App({ url }: AppProps) {

    console.log(process.cwd());
    console.log(`URL is ${url}`)
    const urlObj = new URL(url);
    const artist = urlObj.searchParams.get("artist");
    const db = new Database("./wadsongs.db");
    const stmt = artist ? db.prepare("SELECT * FROM wadsongs WHERE artist=?") : db.prepare("SELECT * FROM wadsongs");
    const results = (artist ? stmt.all(artist) : stmt.all()) as Song[];
    const output = results.map((song: Song) => <p key={`song${song.id}`}>{song.title} by {song.artist}, year {song.year}</p>);
    
    return (
        <html>
            <head>
                <title>RSC</title>
            </head>
            <body>
                <h1>React Server Component!</h1>
                <Counter />
                <AddSong />
                <h2>Songs by {artist || "all artists"}</h2>
                <div>{output}</div>
            </body>
        </html>
    );
}


