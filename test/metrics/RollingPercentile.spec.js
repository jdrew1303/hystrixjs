var RollingPercentile = require("../../lib/metrics/RollingPercentile");
var rewire = require("rewire");
var support = require("../support");

function addExecutionTimes(rollingPercentile) {
    rollingPercentile.addValue(1);
    rollingPercentile.addValue(2);
    rollingPercentile.addValue(3);
    rollingPercentile.addValue(10);
    rollingPercentile.addValue(8);
    rollingPercentile.addValue(4);
    rollingPercentile.addValue(3);
}

describe("RollingPercentile", function() {
    it("should return 0 values before the first roll", function() {
        var underTest = new RollingPercentile();
        addExecutionTimes(underTest);
        expect(underTest.getPercentile("mean")).toBe(0);
        expect(underTest.getPercentile(0)).toBe(0);
        expect(underTest.getPercentile(50)).toBe(0);

    });

    it("should roll the last bucket", function() {
        var RollingPercentileRewired = rewire("../../lib/metrics/RollingPercentile");
        var underTest = new RollingPercentileRewired();
        underTest.addValue(1);
        support.fastForwardActualTime(RollingPercentileRewired, 1500);
        underTest.addValue(2);
        expect(underTest.buckets.length).toBe(2);
    });

    it("should calculate correct percentile after the first window roll", function() {
        var underTest = new RollingPercentile();
        addExecutionTimes(underTest);
        underTest.rollWindow(new Date().getTime());
        expect(underTest.getPercentile("mean").toFixed(2)).toBe("4.43");
        expect(underTest.getPercentile(0).toFixed(2)).toBe("1.00");
        expect(underTest.getPercentile(50).toFixed(2)).toBe("3.00");
    });

    it("should not exceed the max number of buckets", function() {
        var underTest = new RollingPercentile({timeInMillisecond: 10000, numberOfBuckets: 2});
        underTest.rollWindow(new Date().getTime());
        underTest.rollWindow(new Date().getTime());
        underTest.rollWindow(new Date().getTime());
        underTest.rollWindow(new Date().getTime());
        expect(underTest.buckets.length).toBe(2);
    });

    it("should consider values values from all buckets", function() {
        var underTest = new RollingPercentile();
        addExecutionTimes(underTest);
        underTest.rollWindow(new Date().getTime());
        underTest.addValue(10);
        underTest.addValue(923);
        underTest.rollWindow(new Date().getTime());
        expect(underTest.getPercentile("mean").toFixed(2)).toBe("107.11");
        expect(underTest.getPercentile(0).toFixed(2)).toBe("1.00");
        expect(underTest.getPercentile(50).toFixed(2)).toBe("4.00");
    });
});