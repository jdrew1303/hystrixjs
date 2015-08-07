var CommandMetrics = require("../lib/metrics/CommandMetrics").CommandMetrics;
var RollingNumberEvent = require("../lib/metrics/RollingNumberEvent");

describe("CommandMetrics", function() {

    var underTest;


    beforeEach(function() {
        underTest = new CommandMetrics("TestCommand", "defaultGroup");
    });

    it("should increment success counter on markSuccess calls", function() {
        underTest.markSuccess();
        expect(underTest.getRollingCount(RollingNumberEvent.SUCCESS)).toBe(1);
        underTest.markSuccess();
        underTest.markSuccess();
        expect(underTest.getRollingCount(RollingNumberEvent.SUCCESS)).toBe(3);
    });

    it("should increment failure counter on markFailure calls", function() {
        underTest.markFailure();
        expect(underTest.getRollingCount(RollingNumberEvent.FAILURE)).toBe(1);
        underTest.markFailure();
        underTest.markFailure();
        expect(underTest.getRollingCount(RollingNumberEvent.FAILURE)).toBe(3);
    });

    it("should increment timeout counter on markFailure calls", function() {
        underTest.markTimeout();
        expect(underTest.getRollingCount(RollingNumberEvent.TIMEOUT)).toBe(1);
        underTest.markTimeout();
        underTest.markTimeout();
        expect(underTest.getRollingCount(RollingNumberEvent.TIMEOUT)).toBe(3);
    });

    it("should return the sum of all buckets in the window", function(done) {
        underTest.markTimeout();
        underTest.markTimeout();
        underTest.markTimeout();
        setTimeout(function() {
            underTest.markTimeout();
            expect(underTest.getRollingCount(RollingNumberEvent.TIMEOUT)).toBe(4);
            done();
        }, 1001);
    });

    it("should return a correct execution time percentile", function(done) {
        underTest.addExecutionTime(1);
        underTest.addExecutionTime(11);
        setTimeout(function(){
            // this will cause the window to roll and to create the first percentile snapshot
            underTest.addExecutionTime(1);
            expect(underTest.getExecutionTime(100)).toBe(11);
            expect(underTest.getExecutionTime("mean")).toBe(6);
            done();
        }, 1001);
    });

    it("should return 0 values as health counts initially", function(){
        expect(underTest.getHealthCounts().totalCount).toBe(0);
        expect(underTest.getHealthCounts().errorCount).toBe(0);
        expect(underTest.getHealthCounts().errorPercentage).toBe(0);
    });

    it("should return correct values as health counts", function(){

        underTest.markSuccess();
        underTest.markSuccess();
        underTest.markSuccess();

        underTest.markFailure();
        underTest.markFailure();
        underTest.markTimeout();
        underTest.markTimeout();
        underTest.markTimeout();

        expect(underTest.getHealthCounts().totalCount).toBe(8);
        expect(underTest.getHealthCounts().errorCount).toBe(5);
        expect(underTest.getHealthCounts().errorPercentage).toBe(62);
    });

    it("should throw an error if no key is provided", function(){
        expect(function() {
            new CommandMetrics();
        }).toThrowError();
    });
});