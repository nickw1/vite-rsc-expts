"use server"

import Database from "better-sqlite3";

export async function testAction() {
    return "Hello, I am an action!";
}

export async function testActionWithParam(param: number | string) {
    return `This action has been called ${param} times.`;
}

export async function testActionWithState(prevState: { message: string }, formData: FormData) {
    const message = formData.get("message")!.toString();
    return { message }; 
}

export async function addSong(prevState: { id: number | bigint }, formData: FormData) {
    const db = new Database("wadsongs.db");
     const title = formData.get("title")!, artist = formData.get("artist")!, year = formData.get("year")!;
     const stmt = db.prepare("INSERT INTO wadsongs(title, artist, year) VALUES (?, ?, ?)");
     const info = stmt.run(title, artist, year);
     console.log(`ID allocated: ${info.lastInsertRowid}`);
     return { id : info.lastInsertRowid };
}