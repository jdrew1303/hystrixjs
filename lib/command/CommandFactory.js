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

var _Command = require("./Command");

var _Command2 = _interopRequireDefault(_Command);

var hystrixCommandsCache = new Map();

var CommandFactory = (function () {
    function CommandFactory() {
        _classCallCheck(this, CommandFactory);
    }

    _createClass(CommandFactory, null, [{
        key: "create",
        value: function create(commandKey, commandGroup) {
            return new CommandBuilder(commandKey, commandGroup);
        }
    }, {
        key: "resetCache",
        value: function resetCache() {
            hystrixCommandsCache.clear();
        }
    }]);

    return CommandFactory;
})();

exports["default"] = CommandFactory;

var CommandBuilder = (function () {
    function CommandBuilder(commandKey) {
        var commandGroup = arguments.length <= 1 || arguments[1] === undefined ? "hystrix" : arguments[1];

        _classCallCheck(this, CommandBuilder);

        this.commandKey = commandKey;
        this.commandGroup = commandGroup;
        this.config = {};
    }

    _createClass(CommandBuilder, [{
        key: "cleanup",
        value: function cleanup(value) {
            this.config.cleanup = value;
            return this;
        }
    }, {
        key: "circuitBreakerSleepWindowInMilliseconds",
        value: function circuitBreakerSleepWindowInMilliseconds(value) {
            this.config.circuitBreakerSleepWindowInMilliseconds = value;
            return this;
        }
    }, {
        key: "errorHandler",
        value: function errorHandler(value) {
            this.config.isErrorHandler = value;
            return this;
        }
    }, {
        key: "promiseLib",
        value: function promiseLib(value) {
            this.config.promiseLib = value;
            return this;
        }
    }, {
        key: "timeout",
        value: function timeout(value) {
            this.config.timeout = value;
            return this;
        }
    }, {
        key: "circuitBreakerRequestVolumeThreshold",
        value: function circuitBreakerRequestVolumeThreshold(value) {
            this.config.circuitBreakerRequestVolumeThreshold = value;
            return this;
        }
    }, {
        key: "numberOfBuckets",
        value: function numberOfBuckets(value) {
            this.config.numberOfBuckets = value;
            return this;
        }
    }, {
        key: "windowLength",
        value: function windowLength(value) {
            this.config.windowLength = value;
            return this;
        }
    }, {
        key: "circuitBreakerErrorThresholdPercentage",
        value: function circuitBreakerErrorThresholdPercentage(value) {
            this.config.circuitBreakerErrorThresholdPercentage = value;
            return this;
        }
    }, {
        key: "run",
        value: function run(value) {
            this.config.run = value;
            return this;
        }
    }, {
        key: "context",
        value: function context(value) {
            this.config.context = value;
            return this;
        }
    }, {
        key: "fallbackTo",
        value: function fallbackTo(value) {
            this.config.fallback = value;
            return this;
        }
    }, {
        key: "build",
        value: function build() {

            var previouslyCached = hystrixCommandsCache.get(this.commandKey);
            if (previouslyCached) {
                return previouslyCached;
            }

            createMetrics(this);
            createCircuitBreaker(this);
            var command = new _Command2["default"]({
                commandKey: this.commandKey,
                commandGroup: this.commandGroup,
                runContext: this.config.context,
                timeout: this.config.timeout,
                fallback: this.config.fallback,
                run: this.config.run,
                isErrorHandler: this.config.isErrorHandler
            });

            hystrixCommandsCache.set(this.commandKey, command);
            return hystrixCommandsCache.get(this.commandKey);
        }
    }]);

    return CommandBuilder;
})();

function createMetrics(builder) {
    return _metricsCommandMetrics.Factory.getInstance({
        commandKey: builder.commandKey,
        commandGroup: builder.commandGroup,
        timeInMilliSeconds: builder.config.windowLength,
        numberOfBuckets: builder.config.numberOfBuckets
    });
}

function createCircuitBreaker(builder) {
    return _CircuitBreaker2["default"].getInstance({
        circuitBreakerSleepWindowInMilliseconds: builder.config.circuitBreakerSleepWindowInMilliseconds,
        commandKey: builder.commandKey,
        circuitBreakerErrorThresholdPercentage: builder.config.circuitBreakerErrorThresholdPercentage,
        circuitBreakerRequestVolumeThreshold: builder.config.circuitBreakerRequestVolumeThreshold,
        commandGroup: builder.commandGroup
    });
}
module.exports = exports["default"];