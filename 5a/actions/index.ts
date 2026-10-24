"use server"

export async function testAction() {
    return "Hello, I am an action!";
}

export async function testActionWithParam(param: number | string) {
    return `This action has been called ${param} times.`;
}

export async function testActionWithState(prevState: { name: string }, formData: FormData) {
    const name = formData.get("name")!.toString();
    return { name };
}