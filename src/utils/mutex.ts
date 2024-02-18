export default class Mutex {
    private isLocked: boolean = false;
    private queue: (() => void)[] = [];

    async lock(): Promise<void> {
        return new Promise<void>((resolve) => {
            const acquireLock = async () => {
                if (!this.isLocked) {
                    this.isLocked = true;
                    resolve();
                } else {
                    this.queue.push(() => {
                        this.isLocked = true;
                        resolve();
                    });
                }
            };

            acquireLock();
        });
    }

    unlock(): void {
        this.isLocked = false;
        const next = this.queue.shift();
        if (next) {
            next();
        }
    }
}