class EWXNRLogger {
    #baseContext;
    #node;
    #name;
    #withStatus;

    constructor(
        name,
        baseContext,
        node,
        withStatus = true
    ) {
        this.#baseContext = baseContext;
        this.#node = node;
        this.#name = name;
        this.#withStatus = withStatus;
    }

    info(message, additionalContext = {}, color = 'blue') {
        const logMessage = this.#buildLogMessage(message, 'info', additionalContext);

        this.#node.log(logMessage);
        this.#withStatus && this.#node.status({fill: color, shape: 'dot', text: logMessage});
    }

    warn(message, additionalContext = {}) {
        const logMessage = this.#buildLogMessage(message, 'warn', additionalContext);

        this.#node.log(logMessage);
        this.#withStatus && this.#node.status({fill: 'yellow', shape: 'dot', text: logMessage});
    }

    error(messageOrError, additionalContext = {}) {
        const logMessage = this.#buildLogMessage(messageOrError, 'error', additionalContext);

        this.#node.log(logMessage);
        this.#withStatus && this.#node.status({fill: 'red', shape: 'dot', text: logMessage});
    }

    #buildLogMessage(message, level, additionalContext) {
        const baseMessage = message instanceof Error
            ? JSON.stringify(this.#serializeError(message))
            : message;

        const ewxContext = this.#node.ewxConfig ? {
            solutionNamespace: this.#node.ewxConfig.solutionNamespace,
            workerAddress: this.#node.ewxConfig.workerAddress,
        } : {};

        const context = Object.entries({...ewxContext, ...this.#baseContext, ...additionalContext}).reduce((acc, [key, value]) => {
            if (typeof value === 'object' || Array.isArray(value)) {
                acc += `${key}=${JSON.stringify(value)} `;

                return acc;
            }

            acc += `${key}=${value} `;

            return acc;
        }, '');

        return `[${level}][${this.#name}] context:=${context}, msg:=${baseMessage}`;
    }

    #serializeError(error) {
        if (!(error instanceof Error)) return error;

        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause ? this.#serializeError(error.cause) : undefined
        };
    }
}

module.exports = EWXNRLogger;
