var CircuitBreakerFactory = require("../../lib/command/CircuitBreaker");
var CommandMetricsFactory = require("../../lib/metrics/CommandMetrics").Factory;
var CommandMetrics = require("../../lib/metrics/CommandMetrics").CommandMetrics;

describe ("CircuitBreaker", function() {

    beforeEach(function() {
        CommandMetricsFactory.resetCache();
        CircuitBreakerFactory.resetCache();
    });

    function getCBOptions(commandKey) {

        return {
            circuitBreakerSleepWindowInMilliseconds: 1000,
            commandKey: commandKey,
            circuitBreakerErrorThresholdPercentage: 10,
            circuitBreakerRequestVolumeThreshold: 0
        }
    }

    it("should cache instances in the factory", function() {
        var cb = CircuitBreakerFactory.getOrCreate(getCBOptions("Test"));
        expect(cb).not.toBeUndefined();
        expect(CircuitBreakerFactory.getCache().size).toBe(1);
        cb = CircuitBreakerFactory.getOrCreate(getCBOptions("AnotherTest"));
        expect(cb).not.toBeUndefined();
        expect(CircuitBreakerFactory.getCache().size).toBe(2);
    });

    it("should open circuit if error threshold is greater than error percentage", function() {
        var options = getCBOptions("Test");
        var cb = CircuitBreakerFactory.getOrCreate(options);
        var metrics = CommandMetricsFactory.getOrCreate({commandKey: "Test"});
        metrics.markSuccess();
        metrics.markFailure();
        expect(cb.isOpen()).toBeTruthy();
    });

    it("should not open circuit if the volume has not reached threshold", function() {
        var options = getCBOptions("Test");
        options.circuitBreakerRequestVolumeThreshold =2;
        var cb = CircuitBreakerFactory.getOrCreate(options);
        var metrics = CommandMetricsFactory.getOrCreate({commandKey: "Test"});
        metrics.markSuccess();
        metrics.markFailure();
        expect(cb.isOpen()).toBeFalsy();

        metrics.incrementExecutionCount();
        metrics.incrementExecutionCount();
        metrics.incrementExecutionCount();

        expect(cb.isOpen()).toBeTruthy();
    });

    it("should retry after a configured sleep time, if the circuit was open", function(done) {
        var options = getCBOptions("Test");
        var cb = CircuitBreakerFactory.getOrCreate(options);
        var metrics = CommandMetricsFactory.getOrCreate({commandKey: "Test"});
        metrics.markSuccess();
        metrics.markFailure();
        expect(cb.allowRequest()).toBeFalsy();
        setTimeout(function() {
            expect(cb.isOpen()).toBeTruthy();
            expect(cb.allowRequest()).toBeTruthy();
            done();
        }, 1001);
    });

    it("should reset metrics after the circuit was closed again", function() {
        var options = getCBOptions("Test");
        var cb = CircuitBreakerFactory.getOrCreate(options);
        var metrics = CommandMetricsFactory.getOrCreate({commandKey: "Test"});
        metrics.markSuccess();
        metrics.markFailure();
        expect(cb.allowRequest()).toBeFalsy();
        cb.markSuccess();
        expect(cb.allowRequest()).toBeTruthy();
    });

});