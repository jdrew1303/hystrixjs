var RollingNumber = require("../lib/metrics/RollingNumber");
var RollingNumberEvent = require("../lib/metrics/RollingNumberEvent");

describe("RollingNumber", function() {

    it("should be initialised with default values", function() {
        var underTest = new RollingNumber();
        expect(underTest.windowLength).toBe(10000);
        expect(underTest.numberOfBuckets).toBe(10)
    });

    it("should be initialised with option values", function() {
        var underTest = new RollingNumber({timeInMillisecond:5000, numberOfBuckets:5});
        expect(underTest.windowLength).toBe(5000);
        expect(underTest.numberOfBuckets).toBe(5)
    });

    it("should increment a value in the latest bucket", function() {
        var underTest = new RollingNumber({windowLength: 60000, numberOfBuckets: 5});
        var lastBucket = underTest.getCurrentBucket();
        underTest.increment(RollingNumberEvent.SUCCESS);
        underTest.increment(RollingNumberEvent.SUCCESS);
        expect(lastBucket.get(RollingNumberEvent.SUCCESS)).toBe(2);
    });

    it("should roll the last bucket", function(done) {
        var underTest = new RollingNumber();
        var originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        underTest.increment(RollingNumberEvent.SUCCESS);
        setTimeout(function() {
            underTest.increment(RollingNumberEvent.SUCCESS);
            expect(underTest.buckets.length).toBe(2);
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            done();
        }, 1500);
    });

    it("should reset the window if no activity was reported for the period longer than the window itself", function(done) {
        var underTest = new RollingNumber({timeInMillisecond: 1000, numberOfBuckets: 2});
        var originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        underTest.increment(RollingNumberEvent.SUCCESS);
        underTest.rollWindow(Date.now());
        underTest.increment(RollingNumberEvent.SUCCESS);
        expect(underTest.buckets.length).toBe(2);
        setTimeout(function() {
            underTest.increment(RollingNumberEvent.SUCCESS);
            expect(underTest.buckets.length).toBe(1);
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            done();
        }, 1001);
    });

    it("should not exceed the max number of buckets", function() {
        var underTest = new RollingNumber({windowLength: 60000, numberOfBuckets: 2});
        underTest.rollWindow(new Date().getTime());
        underTest.rollWindow(new Date().getTime());
        underTest.rollWindow(new Date().getTime());
        underTest.rollWindow(new Date().getTime());
        expect(underTest.buckets.length).toBe(2);
    });

    it("should return the sum of the values from all buckets", function(done) {
        var underTest = new RollingNumber();
        var originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        underTest.increment(RollingNumberEvent.SUCCESS);
        setTimeout(function() {
            underTest.increment(RollingNumberEvent.SUCCESS);
            underTest.increment(RollingNumberEvent.SUCCESS);
            underTest.increment(RollingNumberEvent.SUCCESS);
            expect(underTest.buckets.length).toBe(2);
            expect(underTest.getRollingSum(RollingNumberEvent.SUCCESS)).toBe(4);
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
            done();
        }, 1500);
    });
});