class WorkerManager {
    private worker: Worker;
    private workerPath: string;
    private config: any;
    private maxRetries: number;
    private retryDelay: number;
    private retryCount: number;
    private isRunning: boolean;

    constructor(workerPath: string, config: any, maxRetries = 5, retryDelay = 5000) {
        this.workerPath = workerPath;
        this.config = config;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.retryCount = 0;
        this.isRunning = false;
        this.initializeWorker();
    }

    private initializeWorker() {
        this.worker = new Worker(this.workerPath, {
            type: "module",
        });
        this.setupEventHandlers();
        this.startWorker();
    }

    private setupEventHandlers() {
        this.worker.onmessage = event => {
            console.log(event.data);
            // Reset retry count on successful message
            this.retryCount = 0;
        };

        this.worker.onerror = error => {
            console.error(`Worker error: ${error}`);
            // this.handleWorkerFailure();
        };

        this.worker.addEventListener("exit", event => {
            if (this.isRunning) {
                console.log(`Worker exited unexpectedly`);
                this.handleWorkerFailure();
            }
        });
    }

    private handleWorkerFailure() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(
                `Attempting to restart worker (attempt ${this.retryCount}/${this.maxRetries})`
            );
            setTimeout(() => {
                this.restartWorker();
            }, this.retryDelay);
        } else {
            console.error(`Worker failed after ${this.maxRetries} retry attempts`);
        }
    }

    private startWorker() {
        this.isRunning = true;
        this.worker.postMessage(this.config);
    }

    private restartWorker() {
        try {
            this.worker.terminate();
        } catch (error) {
            console.error("Error terminating worker:", error);
        }
        this.initializeWorker();
    }

    public postMessage(message: any) {
        try {
            this.worker.postMessage(message);
        } catch (error) {
            console.error("Error posting message to worker:", error);
            this.handleWorkerFailure();
        }
    }

    public terminate() {
        this.isRunning = false;
        this.worker.terminate();
    }
}

export default WorkerManager;
