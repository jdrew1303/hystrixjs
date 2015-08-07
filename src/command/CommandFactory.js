import {Factory as CommandMetricsFactory} from "../metrics/CommandMetrics";
import CircuitBreakerFactory from "./CircuitBreaker";
import Command from "./Command";

const hystrixCommandsCache = new Map();

export default class CommandFactory {

    static create(commandKey, commandGroup) {
        return new CommandBuilder(commandKey, commandGroup);
    }

    static resetCache() {
        hystrixCommandsCache.clear();
    }
}

class CommandBuilder {
    constructor(commandKey, commandGroup = "hystrix") {
        this.commandKey = commandKey;
        this.commandGroup = commandGroup;
        this.config = {};
    }

    cleanup (value) {
        this.config.cleanup = value;
        return this;
    }
    circuitBreakerSleepWindowInMilliseconds (value) {
        this.config.circuitBreakerSleepWindowInMilliseconds = value;
        return this;
    }
    errorHandler (value) {
        this.config.isErrorHandler = value;
        return this;
    }
    promiseLib (value) {
        this.config.promiseLib = value;
        return this;
    }
    timeout (value) {
        this.config.timeout = value;
        return this;
    }
    circuitBreakerRequestVolumeThreshold (value) {
        this.config.circuitBreakerRequestVolumeThreshold = value;
        return this;
    }
    numberOfBuckets (value) {
        this.config.numberOfBuckets = value;
        return this;
    }
    windowLength (value) {
        this.config.windowLength = value;
        return this;
    }
    circuitBreakerErrorThresholdPercentage (value) {
        this.config.circuitBreakerErrorThresholdPercentage = value;
        return this;
    }
    run (value) {
        this.config.run = value;
        return this;
    }
    context (value) {
        this.config.context = value;
        return this;
    }
    fallbackTo (value) {
        this.config.fallback = value;
        return this;
    }
    build () {

        let previouslyCached = hystrixCommandsCache.get(this.commandKey);
        if (previouslyCached) {
            return previouslyCached
        }

        createMetrics(this);
        createCircuitBreaker(this);
        let command = new Command({
                commandKey: this.commandKey,
                commandGroup: this.commandGroup,
                runContext: this.config.context,
                timeout: this.config.timeout,
                fallback: this.config.fallback,
                run: this.config.run,
                isErrorHandler: this.config.isErrorHandler
            });

        hystrixCommandsCache.set(this.commandKey, command);
        return hystrixCommandsCache.get(this.commandKey);
    }

}

function createMetrics(builder) {
    return CommandMetricsFactory.getInstance({
            commandKey: builder.commandKey,
            commandGroup: builder.commandGroup ,
            timeInMilliSeconds: builder.config.windowLength,
            numberOfBuckets: builder.config.numberOfBuckets
         });
}

function createCircuitBreaker(builder) {
    return CircuitBreakerFactory.getInstance({
            circuitBreakerSleepWindowInMilliseconds: builder.config.circuitBreakerSleepWindowInMilliseconds,
            commandKey: builder.commandKey,
            circuitBreakerErrorThresholdPercentage: builder.config.circuitBreakerErrorThresholdPercentage,
            circuitBreakerRequestVolumeThreshold: builder.config.circuitBreakerRequestVolumeThreshold,
            commandGroup: builder.commandGroup
        });
}