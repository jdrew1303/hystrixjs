var CommandFactory = require("../lib/command/CommandFactory");
var q = require("q");
var CommandMetricsFactory = require("../lib/metrics/CommandMetrics").Factory;

describe("Command", function() {
    it("should resolve with expected results", function(done) {
        var run = function(arg) {
            return q.Promise(function(resolve, reject, notify) {
                resolve(arg);
            });
        };

        var command = CommandFactory.create("TestCommand")
            .run(run)
            .build();

        expect(command).not.toBeUndefined();
        command.execute("success").then(function(result) {
            expect(result).toBe("success");
            var metrics = CommandMetricsFactory.getInstance({commandKey: "TestCommand"});
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

        var command = CommandFactory.create("TestCommandTimeout")
            .run(run)
            .timeout(1000)
            .build();

        expect(command).not.toBeUndefined();
        command.execute("success").catch(function(err) {
            expect(err.message).toBe("HystrixTimeOut");
            var metrics = CommandMetricsFactory.getInstance({commandKey: "TestCommandTimeout"});
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

        var command = CommandFactory.create("TestCommandFallback")
            .run(run)
            .fallbackTo(function(err) {
                return q.resolve("fallback");
            })
            .timeout(1000)
            .build();


        expect(command).not.toBeUndefined();
        command.execute("success").then(function(result) {
            expect(result).toBe("fallback");
            var metrics = CommandMetricsFactory.getInstance({commandKey: "TestCommandFallback"});
            expect(metrics.getHealthCounts().totalCount).toBe(1);
            expect(metrics.getHealthCounts().errorCount).toBe(1);
            done();
        })
    });

});