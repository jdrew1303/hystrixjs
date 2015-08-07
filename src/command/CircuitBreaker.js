import ActualTime from "../util/ActualTime";
import {Factory as CommandMetricsFactory} from "../metrics/CommandMetrics";

class CircuitBreaker {
    constructor({
            circuitBreakerSleepWindowInMilliseconds: sleep,
            commandKey: key,
            commandGroup: group,
            circuitBreakerErrorThresholdPercentage: errorThreshold,
            circuitBreakerRequestVolumeThreshold: volumeThreshold = 5
        }) {
        this.circuitBreakerSleepWindowInMilliseconds = sleep;
        this.commandKey = key;
        this.commandGroup = group;
        this.circuitBreakerRequestVolumeThreshold = volumeThreshold;
        this.circuitBreakerErrorThresholdPercentage = errorThreshold;
        this.circuitOpen = false;
        this.circuitOpenedOrLastTestedTime = ActualTime.getCurrentTime();
    }

    allowRequest() {
        return !this.isOpen() || this.allowSingleTest();
    }

    get metrics() {
        return CommandMetricsFactory.getInstance({commandKey: this.commandKey});
    }

    allowSingleTest() {
        if (this.circuitOpen && ActualTime.getCurrentTime() > this.circuitOpenedOrLastTestedTime + this.circuitBreakerSleepWindowInMilliseconds) {
            return true;
        } else {
            return false;
        }
    }

    isOpen() {
        if (this.circuitOpen) {
            return true;
        }

        let {totalCount = 0, errorCount , errorPercentage} = this.metrics.getHealthCounts();
        if (this.metrics.getCurrentExecutionCount() < this.circuitBreakerRequestVolumeThreshold) {
            return false;
        }

        if (errorPercentage > this.circuitBreakerErrorThresholdPercentage) {
            this.circuitOpen = true;
            this.circuitOpenedOrLastTestedTime = ActualTime.getCurrentTime();
            return true;
        } else {
            return false;
        }
    }

    markSuccess() {
        if (this.circuitOpen) {
            this.circuitOpen = false;
            this.metrics.reset();
        }
    }
}

const circuitBreakersByCommand = new Map();

export default class Factory {

    static getInstance({
            circuitBreakerSleepWindowInMilliseconds = 1000,
            commandKey,
            circuitBreakerErrorThresholdPercentage = 10,
            circuitBreakerRequestVolumeThreshold = 5,
            commandGroup = "hystrix"
        } = {}) {

        let previouslyCached = circuitBreakersByCommand.get(commandKey);
        if (previouslyCached) {
            return previouslyCached
        }

        let circuitBreaker = new CircuitBreaker(arguments[0]);
        circuitBreakersByCommand.set(commandKey, circuitBreaker);
        return circuitBreakersByCommand.get(commandKey);

    }

    static getCache() {
        return circuitBreakersByCommand;
    }

    static resetCache() {
        circuitBreakersByCommand.clear();
    }
}