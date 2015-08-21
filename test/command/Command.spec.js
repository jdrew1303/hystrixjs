var CommandFactory = require("../../lib/command/CommandFactory");
var q = require("q");
var CommandMetricsFactory = require("../../lib/metrics/CommandMetrics").Factory;
describe("Command", function() {
    it("should resolve with expected results", function(done) {
        var run = function(arg) {
            return q.Promise(function(resolve, reject, notify) {
                resolve(arg);
            });
        };

        var command = CommandFactory.getOrCreate("TestCommand")
            .run(run)
            .build();

        expect(command).not.toBeUndefined();
        command.execute("success").then(function(result) {
            expect(result).toBe("success");
            var metrics = CommandMetricsFactory.getOrCreate({commandKey: "TestCommand"});
            expect(metrics.getHealthCounts().totalCount).toBe(1);
            expect(metrics.getHealthCounts().errorCount).toBe(0);
            done();
        })
    });

    it("should timeout if the function does not resolve within the configured timeout", function(done) {
        var run = function(arg) {
            return q.Promise(function(resolve, reject, notify) {
                setTimeout(function() {
                    resolve(arg);
                }, 10000);
            });
        };

        var command = CommandFactory.getOrCreate("TestCommandTimeout")
            .run(run)
            .timeout(500)
            .build();

        expect(command).not.toBeUndefined();
        command.execute("success").catch(function(err) {
            expect(err.message).toBe("CommandTimeOut");
            var metrics = CommandMetricsFactory.getOrCreate({commandKey: "TestCommandTimeout"});
            expect(metrics.getHealthCounts().totalCount).toBe(1);
            expect(metrics.getHealthCounts().errorCount).toBe(1);
            done();
        })
    });

    it("should resolve with fallback if the run function fails", function(done) {
        var run = function(arg) {
            return q.Promise(function(resolve, reject, notify) {
                throw new Error("rejected")
            });
        };

        var command = CommandFactory.getOrCreate("TestCommandFallback")
            .run(run)
            .fallbackTo(function(err) {
                return q.resolve("fallback");
            })
            .timeout(1000)
            .build();


        command.execute("success").then(function(result) {
            expect(result).toBe("fallback");
            var metrics = CommandMetricsFactory.getOrCreate({commandKey: "TestCommandFallback"});
            expect(metrics.getHealthCounts().totalCount).toBe(1);
            expect(metrics.getHealthCounts().errorCount).toBe(1);
            done();
        })
    });

    it("should not execute the run command, if the circuit is open and the threshold is reached", function(done) {
        var object = {
            run:function() {
                return q.Promise(function(resolve, reject, notify) {
                    reject(new Error("error"));
                });
            }
        };

        spyOn(object, "run").and.callThrough();
        var command = CommandFactory.getOrCreate("TestCommandThreshold")
            .run(object.run)
            .fallbackTo(function(err) {
                return q.resolve("fallback");
            })
            .circuitBreakerErrorThresholdPercentage(10)
            .circuitBreakerRequestVolumeThreshold(3)
            .build();

        var metrics =CommandMetricsFactory.getOrCreate({commandKey: "TestCommandThreshold"});
        metrics.incrementExecutionCount();
        metrics.incrementExecutionCount();
        metrics.incrementExecutionCount();
        metrics.incrementExecutionCount();
        metrics.markFailure();
        command.execute().then(function(result) {
            expect(result).toBe("fallback");
            expect(object.run).not.toHaveBeenCalled();
            done();
        });
    });

    it("should execute the run command, if the threshold is not reached", function(done) {
        var object = {
            run:function() {
                return q.Promise(function(resolve, reject, notify) {
                    reject(new Error("error"));
                });
            }
        };

        spyOn(object, "run").and.callThrough();
        var command = CommandFactory.getOrCreate("TestCommandThresholdNotReached")
            .run(object.run)
            .fallbackTo(function(err) {
                return q.resolve("fallback");
            })
            .circuitBreakerErrorThresholdPercentage(10)
            .circuitBreakerRequestVolumeThreshold(3)
            .build();

        var metrics =CommandMetricsFactory.getOrCreate({commandKey: "TestCommandThresholdNotReached"});
        metrics.incrementExecutionCount();
        metrics.markFailure();
        metrics.markFailure();
        command.execute().then(function(result) {
            expect(result).toBe("fallback");
            expect(object.run).toHaveBeenCalled();
            done();
        });
    });

    it("should return fallback and not mark failure, if the command failed but with expected error", function() {

        var command = CommandFactory.getOrCreate("TestCommandErrorHandler")
            .run(function() {
                return q.Promise(function(resolve, reject, notify) {
                    reject(new Error("custom-error"));
                });
            })
            .errorHandler(function(error) {
                if (error.message == "custom-error") {
                    return false;
                }
                return error;
            })
            .fallbackTo(function(err) {
                return q.resolve("fallback");
            })
            .circuitBreakerErrorThresholdPercentage(10)
            .circuitBreakerRequestVolumeThreshold(0)
            .build();

        var metrics = CommandMetricsFactory.getOrCreate({commandKey: "TestCommandErrorHandler"});
        command.execute().then(function(result) {
            expect(result).toBe("fallback");
            var errorCount = metrics.getHealthCounts().errorCount;
            expect(errorCount).toBe(0);
            done();
        });
    });

});