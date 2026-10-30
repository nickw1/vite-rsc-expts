
export default async function examineStream(stream: ReadableStream) {
    const [stream1, stream2] = stream.tee();
    const reader = stream2.getReader();
    const textDecoder = new TextDecoder();
    let cont = true;
    while (cont) {
        const { done, value } = await reader.read();
        console.log(textDecoder.decode(value));
        if (done) cont = false;
    }
    return stream1;
}