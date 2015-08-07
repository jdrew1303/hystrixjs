import RollingNumber from "./RollingNumber";
import RollingPercentile from "./RollingPercentile";
import RollingNumberEvent from "./RollingNumberEvent";
import ActualTime from "../util/ActualTime";

export class CommandMetrics {
    constructor(commandKey, commandGroup = "hystrix", {
            timeInMilliSeconds = 10000,
            numberOfBuckets = 10
        } = {}) {

        if (!commandKey) {
            throw new Error("Please provide a unique command key for the metrics.");
        }
        this.currentExecutionCount = 0;
        this.metricsRollingStatisticalWindowInMilliseconds = timeInMilliSeconds;
        this.commandKey = commandKey;
        this.commandGroup = commandGroup;
        this.lastHealthCountsSnapshot = ActualTime.getCurrentTime();
        this.rollingCount = new RollingNumber(timeInMilliSeconds, numberOfBuckets);
        this.percentileCount = new RollingPercentile(timeInMilliSeconds, numberOfBuckets);
    }

    markSuccess() {
        this.rollingCount.increment(RollingNumberEvent.SUCCESS);
    }

    markFailure() {
        this.rollingCount.increment(RollingNumberEvent.FAILURE);
    }

    markTimeout() {
        this.rollingCount.increment(RollingNumberEvent.TIMEOUT);
    }

    markShortCircuited() {
        this.rollingCount.increment(RollingNumberEvent.SHORT_CIRCUITED);
    }

    incrementExecutionCount() {
        ++this.currentExecutionCount;
    }

    decrementExecutionCount() {
        --this.currentExecutionCount;
    }

    getCurrentExecutionCount() {
        return this.currentExecutionCount;
    }

    addExecutionTime(time) {
        this.percentileCount.addValue(time);
    }

    getRollingCount(type) {
        return this.rollingCount.getRollingSum(type);
    }

    getExecutionTime(percentile) {
        return this.percentileCount.getPercentile(percentile);
    }

    getHealthCounts() {
        //TODO restrict calculation by time to avoid too frequent calls
        let success = this.rollingCount.getRollingSum(RollingNumberEvent.SUCCESS);
        let error = this.rollingCount.getRollingSum(RollingNumberEvent.FAILURE);
        let timeout = this.rollingCount.getRollingSum(RollingNumberEvent.TIMEOUT);
        let shortCircuited = this.rollingCount.getRollingSum(RollingNumberEvent.SHORT_CIRCUITED);

        let totalCount = success + error + timeout + shortCircuited;
        let errorCount = error + timeout + shortCircuited;

        let errorPercentage = 0;
        if (totalCount > 0) {
            errorPercentage = errorCount / totalCount * 100;
        }

        return {
            totalCount: totalCount,
            errorCount: errorCount,
            errorPercentage: parseInt(errorPercentage)
        }
    }

    reset() {
        this.rollingCount.reset();
        this.lastHealthCountsSnapshot = ActualTime.getCurrentTime();
    }
}

const metricsByCommand = new Map();
export class Factory {

    static getInstance({
        commandKey,
        commandGroup = "hystrix",
        timeInMilliSeconds,
        numberOfBuckets
        } = {}) {

        let previouslyCached = metricsByCommand.get(commandKey);
        if (previouslyCached) {
            return previouslyCached
        }

        let metrics = new CommandMetrics(commandKey, commandGroup, {
            timeInMilliSeconds: timeInMilliSeconds,
            numberOfBuckets: numberOfBuckets
        });
        metricsByCommand.set(commandKey, metrics);
        return metricsByCommand.get(commandKey);

    }

    static resetCache() {
        metricsByCommand.clear();
    }

    static getAllMetrics() {
        return metricsByCommand.values();
    }
}
