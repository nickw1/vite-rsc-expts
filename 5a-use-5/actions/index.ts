"use server"

export async function testAction() {
    return "Hello, I am an action!";
}

export async function testActionWithParam(param: number | string) {
    return `This action has been called ${param} times.`;
}

export async function testActionWithState(prevState: { title: string, artist: string }, formData: FormData) {
    const title = formData.get("title")!.toString(), artist = formData.get("artist")!.toString();
    return { title, artist };
}