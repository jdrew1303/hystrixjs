import {Factory as CommandMetricsFactory} from "../metrics/CommandMetrics";
import CircuitBreakerFactory from "./CircuitBreaker";
import q from "q";
import ActualTime from "../util/ActualTime"
import HystrixConfig from "../util/HystrixConfig";

export default class Command {
    constructor({
            commandKey,
            commandGroup,
            runContext,
            metricsConfig,
            circuitConfig,
            timeout = HystrixConfig.executionTimeoutInMilliseconds,
            fallback = function(error) {return q.reject(error);},
            run = function() {throw new Error("Command must implement run method.")},
            isErrorHandler = function(error) {return error;},
        }) {
        this.commandKey = commandKey;
        this.commandGroup = commandGroup;
        this.run = run;
        this.runContext = runContext;
        this.fallback = fallback;
        this.timeout = timeout;
        this.isError = isErrorHandler;
        this.metricsConfig = metricsConfig;
        this.circuitConfig = circuitConfig;
    }

    get circuitBreaker() {
        return CircuitBreakerFactory.getOrCreate(this.circuitConfig);
    }

    get metrics() {
        return CommandMetricsFactory.getOrCreate(this.metricsConfig);
    }

    execute() {
        if (this.circuitBreaker.allowRequest()) {
            return this.runCommand.apply(this, arguments);
        } else {
            this.metrics.markShortCircuited();
            return this.fallback(new Error("OpenCircuitError"));
        }
    }

    runCommand() {
        this.metrics.incrementExecutionCount();
        let start = ActualTime.getCurrentTime();
        let promise = this.run.apply(this.runContext, arguments);
        if (this.timeout > 0) {
            promise = promise.timeout(this.timeout, "CommandTimeOut");
        }

        return promise
        .then((...args) => {
                return this.handleSuccess(start, args);
            }
        )
        .fail(err => {
                return this.handleFailure(err);
            }
        )
        .finally(() => {
                this.metrics.decrementExecutionCount()
            }
        );
    }

    handleSuccess(start, args) {
        let end = ActualTime.getCurrentTime();
        this.metrics.addExecutionTime(end - start);
        this.metrics.markSuccess();
        this.circuitBreaker.markSuccess();
        return q.resolve.apply(null, args);
    }

    handleFailure(err) {
        if (this.isError(err)) {
            if (err.message === "CommandTimeOut") {
                this.metrics.markTimeout();
            } else {
                this.metrics.markFailure();
            }
        }
        return this.fallback(err);
    }
}
