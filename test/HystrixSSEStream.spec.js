var HystrixSSEStream = require("../lib/http/HystrixSSEStream");
var CommandFactory = require("../lib/command/CommandFactory");
var CommandMetricsFactory = require("../lib/metrics/CommandMetrics").Factory;
var q = require("q");

describe("HystrixSSEStream", function() {

    beforeEach(function() {
        CommandFactory.resetCache();
        CommandMetricsFactory.resetCache();
    });

    function executeCommand(commandKey) {
        var run = function(arg) {
            return q.Promise(function(resolve, reject, notify) {
                setTimeout(function() {
                    resolve(arg);
                }, 1000)
            });
        };

        var command = CommandFactory.create(commandKey)
            .run(run)
            .build();


        command.execute("success");
    }
    it("should poll metrics every 5 seconds", function() {
        executeCommand("HystrixSSECommand1");
        executeCommand("HystrixSSECommand1");
        executeCommand("HystrixSSECommand2");
        executeCommand("HystrixSSECommand2");
        setTimeout(function() {
            executeCommand("HystrixSSECommand3");
            var stream = HystrixSSEStream.toObservable();
            var subscription = stream.subscribe(
                function(next) {
                    subscription.dispose();
                }
            );
        }, 1001);
    });
});