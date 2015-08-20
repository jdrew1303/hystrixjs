"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _metricsCommandMetrics = require("../metrics/CommandMetrics");

var _CircuitBreaker = require("./CircuitBreaker");

var _CircuitBreaker2 = _interopRequireDefault(_CircuitBreaker);

var _q = require("q");

var _q2 = _interopRequireDefault(_q);

var _utilActualTime = require("../util/ActualTime");

var _utilActualTime2 = _interopRequireDefault(_utilActualTime);

var _utilHystrixConfig = require("../util/HystrixConfig");

var _utilHystrixConfig2 = _interopRequireDefault(_utilHystrixConfig);

var Command = (function () {
    function Command(_ref) {
        var commandKey = _ref.commandKey;
        var commandGroup = _ref.commandGroup;
        var runContext = _ref.runContext;
        var metricsConfig = _ref.metricsConfig;
        var circuitConfig = _ref.circuitConfig;
        var _ref$timeout = _ref.timeout;
        var timeout = _ref$timeout === undefined ? _utilHystrixConfig2["default"].executionTimeoutInMilliseconds : _ref$timeout;
        var _ref$fallback = _ref.fallback;
        var fallback = _ref$fallback === undefined ? function (error) {
            return _q2["default"].reject(error);
        } : _ref$fallback;
        var _ref$run = _ref.run;
        var run = _ref$run === undefined ? function () {
            throw new Error("Command must implement run method.");
        } : _ref$run;
        var _ref$isErrorHandler = _ref.isErrorHandler;
        var isErrorHandler = _ref$isErrorHandler === undefined ? function (error) {
            return error;
        } : _ref$isErrorHandler;

        _classCallCheck(this, Command);

        this.commandKey = commandKey;
        this.commandGroup = commandGroup;
        this.run = run;
        this.runContext = runContext;
        this.fallback = fallback;
        this.timeout = timeout;
        this.isError = isErrorHandler;
        this.metricsConfig = metricsConfig;
        this.circuitConfig = circuitConfig;
    }

    _createClass(Command, [{
        key: "execute",
        value: function execute() {
            if (this.circuitBreaker.allowRequest()) {
                return this.runCommand.apply(this, arguments);
            } else {
                this.metrics.markShortCircuited();
                return this.fallback(new Error("OpenCircuitError"));
            }
        }
    }, {
        key: "runCommand",
        value: function runCommand() {
            var _this = this;

            this.metrics.incrementExecutionCount();
            var start = _utilActualTime2["default"].getCurrentTime();
            var promise = this.run.apply(this.runContext, arguments);
            if (this.timeout > 0) {
                promise = promise.timeout(this.timeout, "CommandTimeOut");
            }

            return promise.then(function () {
                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                }

                return _this.handleSuccess(start, args);
            }).fail(function (err) {
                return _this.handleFailure(err);
            })["finally"](function () {
                _this.metrics.decrementExecutionCount();
            });
        }
    }, {
        key: "handleSuccess",
        value: function handleSuccess(start, args) {
            var end = _utilActualTime2["default"].getCurrentTime();
            this.metrics.addExecutionTime(end - start);
            this.metrics.markSuccess();
            this.circuitBreaker.markSuccess();
            return _q2["default"].resolve.apply(null, args);
        }
    }, {
        key: "handleFailure",
        value: function handleFailure(err) {
            if (this.isError(err)) {
                if (err.message === "CommandTimeOut") {
                    this.metrics.markTimeout();
                } else {
                    this.metrics.markFailure();
                }
            }
            return this.fallback(err);
        }
    }, {
        key: "circuitBreaker",
        get: function get() {
            return _CircuitBreaker2["default"].getOrCreate(this.circuitConfig);
        }
    }, {
        key: "metrics",
        get: function get() {
            return _metricsCommandMetrics.Factory.getOrCreate(this.metricsConfig);
        }
    }]);

    return Command;
})();

exports["default"] = Command;
module.exports = exports["default"];