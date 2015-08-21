var sinon = require("sinon");

module.exports = {
    fastForwardActualTime: function fastForward(constructorFn, milliseconds) {
        var actualTimeStub = sinon.stub().returns(Date.now() + milliseconds);
        var actualTime = {
            "getCurrentTime": actualTimeStub
        };
        constructorFn.__set__("_utilActualTime2", {
            "default": actualTime
        });
    }

};