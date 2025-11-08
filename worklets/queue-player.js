// public/worklets/queue-player.js

class QueuePlayer extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffers = [];
        this.port.onmessage = (e) => {
            if (e.data.type === 'push') {
                this.buffers.push(new Float32Array(e.data.buffer));
            }
        };
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const leftChannel = output[0];
        const rightChannel = output[1];

        let framesCopied = 0;

        // Copy samples from queued buffers into the output channels
        while (this.buffers.length > 0 && framesCopied < leftChannel.length) {
            const currentBuffer = this.buffers[0];
            const framesToCopy = Math.min(leftChannel.length - framesCopied, currentBuffer.length / 2);

            for (let i = 0; i < framesToCopy; i++) {
                leftChannel[framesCopied + i] = currentBuffer[i * 2];
                rightChannel[framesCopied + i] = currentBuffer[i * 2 + 1];
            }

            framesCopied += framesToCopy;

            if (framesToCopy < currentBuffer.length / 2) {
                // If we didn't use the whole buffer, slice it and put it back
                this.buffers[0] = currentBuffer.slice(framesToCopy * 2);
            } else {
                // If we used the whole buffer, remove it from the queue
                this.buffers.shift();
            }
        }

        // Inform the main thread if we need more data
        if (this.buffers.length < 5) { // Example low-water mark
            this.port.postMessage({ type: 'lowWater' });
        }

        return true; // Keep the processor alive
    }
}

registerProcessor('queue-player', QueuePlayer);