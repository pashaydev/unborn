class WorkerManager {
    private worker!: Worker;
    private workerPath: string;
    private config: Record<string, any>;
    private maxRetries: number;
    private retryDelay: number;
    private retryCount: number;
    private isRunning: boolean;

    constructor(
        workerPath: string,
        config: Record<string, any>,
        maxRetries = 5,
        retryDelay = 5000
    ) {
        this.workerPath = workerPath;
        this.config = config;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.retryCount = 0;
        this.isRunning = false;
        this.initializeWorker();
    }

    private initializeWorker() {
        const workerUrl = new URL(this.workerPath, import.meta.url).href;

        this.worker = new Worker(workerUrl, {
            type: "module",
        });

        this.setupEventHandlers();
        this.startWorker();
    }

    private setupEventHandlers() {
        this.worker.onmessage = (event: MessageEvent) => {
            console.log("Worker message:", event.data);
            this.retryCount = 0;
        };

        this.worker.onerror = (error: ErrorEvent) => {
            console.error("Worker error:", error.message);
            this.handleWorkerFailure();
        };
    }

    private async handleWorkerFailure() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(
                `Attempting to restart worker (attempt ${this.retryCount}/${this.maxRetries})`
            );
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            this.restartWorker();
        } else {
            console.error(`Worker failed after ${this.maxRetries} retry attempts`);
        }
    }

    private startWorker() {
        this.isRunning = true;
        try {
            this.worker.postMessage(this.config);
        } catch (error) {
            console.error("Error starting worker:", error);
            this.handleWorkerFailure();
        }
    }

    private async restartWorker() {
        try {
            await this.worker.terminate();
        } catch (error) {
            console.error("Error terminating worker:", error);
        }
        this.initializeWorker();
    }

    public postMessage(message: any) {
        if (!this.isRunning) {
            console.error("Worker is not running");
            return;
        }

        try {
            this.worker.postMessage(message);
        } catch (error) {
            console.error("Error posting message to worker:", error);
            this.handleWorkerFailure();
        }
    }

    public async terminate() {
        this.isRunning = false;
        try {
            await this.worker.terminate();
        } catch (error) {
            console.error("Error terminating worker:", error);
        }
    }
}

export default WorkerManager;
