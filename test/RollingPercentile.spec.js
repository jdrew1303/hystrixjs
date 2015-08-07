var RollingPercentile = require("../lib/metrics/RollingPercentile");

describe("RollingPercentile", function() {
    it("should calculate corrent percentile", function() {
        var underTest = new RollingPercentile();
        underTest.addValue(1);
        underTest.addValue(2);
        underTest.addValue(3);
        underTest.addValue(10);
        underTest.addValue(8);
        underTest.addValue(4);
        underTest.addValue(3);
        underTest.rollWindow(new Date().getTime());
        expect(underTest.getPercentile("mean").toFixed(2)).toBe("4.43");
        expect(underTest.getPercentile(0).toFixed(2)).toBe("1.00");
        expect(underTest.getPercentile(50).toFixed(2)).toBe("3.00");
    })

});