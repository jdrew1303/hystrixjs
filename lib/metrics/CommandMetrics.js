"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _RollingNumber = require("./RollingNumber");

var _RollingNumber2 = _interopRequireDefault(_RollingNumber);

var _RollingPercentile = require("./RollingPercentile");

var _RollingPercentile2 = _interopRequireDefault(_RollingPercentile);

var _RollingNumberEvent = require("./RollingNumberEvent");

var _RollingNumberEvent2 = _interopRequireDefault(_RollingNumberEvent);

var _utilActualTime = require("../util/ActualTime");

var _utilActualTime2 = _interopRequireDefault(_utilActualTime);

var CommandMetrics = (function () {
    function CommandMetrics(commandKey) {
        var commandGroup = arguments.length <= 1 || arguments[1] === undefined ? "hystrix" : arguments[1];

        var _ref = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        var _ref$timeInMilliSeconds = _ref.timeInMilliSeconds;
        var timeInMilliSeconds = _ref$timeInMilliSeconds === undefined ? 10000 : _ref$timeInMilliSeconds;
        var _ref$numberOfBuckets = _ref.numberOfBuckets;
        var numberOfBuckets = _ref$numberOfBuckets === undefined ? 10 : _ref$numberOfBuckets;

        _classCallCheck(this, CommandMetrics);

        if (!commandKey) {
            throw new Error("Please provide a unique command key for the metrics.");
        }
        this.currentExecutionCount = 0;
        this.metricsRollingStatisticalWindowInMilliseconds = timeInMilliSeconds;
        this.commandKey = commandKey;
        this.commandGroup = commandGroup;
        this.lastHealthCountsSnapshot = _utilActualTime2["default"].getCurrentTime();
        this.rollingCount = new _RollingNumber2["default"](timeInMilliSeconds, numberOfBuckets);
        this.percentileCount = new _RollingPercentile2["default"](timeInMilliSeconds, numberOfBuckets);
    }

    _createClass(CommandMetrics, [{
        key: "markSuccess",
        value: function markSuccess() {
            this.rollingCount.increment(_RollingNumberEvent2["default"].SUCCESS);
        }
    }, {
        key: "markFailure",
        value: function markFailure() {
            this.rollingCount.increment(_RollingNumberEvent2["default"].FAILURE);
        }
    }, {
        key: "markTimeout",
        value: function markTimeout() {
            this.rollingCount.increment(_RollingNumberEvent2["default"].TIMEOUT);
        }
    }, {
        key: "markShortCircuited",
        value: function markShortCircuited() {
            this.rollingCount.increment(_RollingNumberEvent2["default"].SHORT_CIRCUITED);
        }
    }, {
        key: "incrementExecutionCount",
        value: function incrementExecutionCount() {
            ++this.currentExecutionCount;
        }
    }, {
        key: "decrementExecutionCount",
        value: function decrementExecutionCount() {
            --this.currentExecutionCount;
        }
    }, {
        key: "getCurrentExecutionCount",
        value: function getCurrentExecutionCount() {
            return this.currentExecutionCount;
        }
    }, {
        key: "addExecutionTime",
        value: function addExecutionTime(time) {
            this.percentileCount.addValue(time);
        }
    }, {
        key: "getRollingCount",
        value: function getRollingCount(type) {
            return this.rollingCount.getRollingSum(type);
        }
    }, {
        key: "getExecutionTime",
        value: function getExecutionTime(percentile) {
            return this.percentileCount.getPercentile(percentile);
        }
    }, {
        key: "getHealthCounts",
        value: function getHealthCounts() {
            //TODO restrict calculation by time to avoid too frequent calls
            var success = this.rollingCount.getRollingSum(_RollingNumberEvent2["default"].SUCCESS);
            var error = this.rollingCount.getRollingSum(_RollingNumberEvent2["default"].FAILURE);
            var timeout = this.rollingCount.getRollingSum(_RollingNumberEvent2["default"].TIMEOUT);
            var shortCircuited = this.rollingCount.getRollingSum(_RollingNumberEvent2["default"].SHORT_CIRCUITED);

            var totalCount = success + error + timeout + shortCircuited;
            var errorCount = error + timeout + shortCircuited;

            var errorPercentage = 0;
            if (totalCount > 0) {
                errorPercentage = errorCount / totalCount * 100;
            }

            return {
                totalCount: totalCount,
                errorCount: errorCount,
                errorPercentage: parseInt(errorPercentage)
            };
        }
    }, {
        key: "reset",
        value: function reset() {
            this.rollingCount.reset();
            this.lastHealthCountsSnapshot = _utilActualTime2["default"].getCurrentTime();
        }
    }]);

    return CommandMetrics;
})();

exports.CommandMetrics = CommandMetrics;

var metricsByCommand = new Map();

var Factory = (function () {
    function Factory() {
        _classCallCheck(this, Factory);
    }

    _createClass(Factory, null, [{
        key: "getInstance",
        value: function getInstance() {
            var _ref2 = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

            var commandKey = _ref2.commandKey;
            var _ref2$commandGroup = _ref2.commandGroup;
            var commandGroup = _ref2$commandGroup === undefined ? "hystrix" : _ref2$commandGroup;
            var timeInMilliSeconds = _ref2.timeInMilliSeconds;
            var numberOfBuckets = _ref2.numberOfBuckets;

            var previouslyCached = metricsByCommand.get(commandKey);
            if (previouslyCached) {
                return previouslyCached;
            }

            var metrics = new CommandMetrics(commandKey, commandGroup, {
                timeInMilliSeconds: timeInMilliSeconds,
                numberOfBuckets: numberOfBuckets
            });
            metricsByCommand.set(commandKey, metrics);
            return metricsByCommand.get(commandKey);
        }
    }, {
        key: "resetCache",
        value: function resetCache() {
            metricsByCommand.clear();
        }
    }, {
        key: "getAllMetrics",
        value: function getAllMetrics() {
            return metricsByCommand.values();
        }
    }]);

    return Factory;
})();

exports.Factory = Factory;