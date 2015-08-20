# HystrixJS - resilience library for NodeJs applications

This library is inspired by the by the the Netflix [Hystrix](https://github.com/Netflix/Hystrix/wiki/) module for Java applications, which "is a latency and fault tolerance library designed to isolate points of access to remote systems, services and 3rd party libraries, stop cascading failure and enable resilience in complex distributed systems where failure is inevitable".

## How does it work?

Basically it tries to achieve the same goals as the original Netflix implementation:

- protect applications from failures from dependencies accessed over the network or 3rd party clients
- stop cascading failures and prevent ripple effect
- fail fast and rapidly recover
- provide a sensible fallback and degrade gracefully if possible
- provide near realtime monitoring

Since this library targets nodejs application, it is by far not as complex as the java implementation (remember... just one thread... no concurrency, at least most of the time...). So how does it accomplish the goals outlined above:

- wraps all promise-based calls to external systems (or "dependencies") in a "Command"
- times out calls that take longer, than the configured threshold.
- measures successes, failures (exceptions thrown by client), timeouts, and short circuits
- measures execution times
- trips a circuit-breaker to stop all requests to a particular service for a period of time, if the error percentage for this service passes a configured threshold
- performs fallback logic, when the execution fails, times out or is short-circuits
- provides a SSE of metrics, which can be visualised in [Hystrix Dashbord](https://github.com/Netflix/Hystrix/tree/master/hystrix-dashboard) for near real-time monitoring

Following diagram shows what happens when a function call is wrapped in a Command

![diagram.png](https://bitbucket.org/repo/zq8Kzy/images/79170045-diagram.png)

The Command is constructed with the help of the CommandsFactory. It expects a unique key and a "run" function, which will be called, when the command is executed. Note: the function must return a Promise.
The returned object provides an execute() method, which will call the specified "run" function with the passed arguments. Within the execute() method it will check if the circuit breaker is open (or "tripped") and if it is,
it will forward the execution to the fallback function with the Error("OpenCircuitError"). If the circuit is closed, the command will call the provided "run" function.
If the function times out or fails, the execution will be forwarded to the fallback method with the Error("CommandTimeOut") or the execution error respectively.
Per default the fallback function rejects the promise with the passed error. It could however implement a logic to provide a generic response, which does not depend on network calls.
If the "run" function succeeds, the command will return a Promise resolving with the response, after it performs some metrics logging.

## Calculating Circuit Breaker Health

The circuit breaker follows the same logic as the one in the original Hystrix [Module](https://github.com/Netflix/Hystrix/wiki/How-it-Works#circuit-breaker). In short following steps are performed to calculate the health:

- if the volume across the circuit does not exceed the configured volume threshold, the will just execute the run function without checking (the metrics will still be logged and considered for future checks).
If the volume exceeds the threshold, the circuit will check the health first
- if the error percentage exceeds the configured threshold, the circuit transitions from Closed to Opened state and all requests will be rejected with the Open Circuit Error
- after configured time the circuit breaker will allow a single request to check if the services has recovered. If this request succeeds, the circuit is closed and the counters are reseted.

## Creating a command

All external communication points should be wrapped within a command. The command factory is the entry point to get the existing or generate a new command.

```javascript

var serviceCommand = CommandsFactory.getOrCreate("Service on port :" + service.port + ":" + port)
    .circuitBreakerErrorThresholdPercentage(service.errorThreshold)
    .timeout(service.timeout)
    .run(makeRequest)
    .circuitBreakerRequestVolumeThreshold(service.concurrency)
    .circuitBreakerSleepWindowInMilliseconds(service.timeout)
    .statisticalWindowLength(10000)
    .statisticalWindowNumberOfBuckets(10)
    .errorHandler(isErrorHandler)
    .build();

```

Each generated command is cached based on its key supplied as the first parameter. The "getOrCreate()" method returns a "CommandBuilder" object, which provides methods for configuration of:

- *circuitBreakerSleepWindowInMilliseconds* - how long the circuit breaker should stay opened, before allowing a single request to test the health of the service
- *errorHandler* - function to validate if the error response from the service is an actual error. If this function returns an error object (default implementation),
this request call will be marked as failure, which will influence the error percentage.
If it returns null or false, the call will not be marked as failure. An example could be a 404 error, if the customer is not found.
- *timeout* for request
- *circuitBreakerRequestVolumeThreshold* - number of concurrent execution, that needs to be exceeded, before the circuit breaker will bother at all to calculate the health
- *circuitBreakerForceOpened* - force this circuit breaker to be always opened
- *circuitBreakerForceClosed* - force this circuit breaker to be always closed
- *circuitBreakerErrorThresholdPercentage* - error percentage threshold to trip the circuit
- *statisticalWindowLength* - length of the window to keep track of execution counts metrics (success, failure)
- *statisticalWindowNumberOfBuckets* - number of buckets within the statistical window
- *percentileWindowNumberOfBuckets* - number of buckets within the percentile window
- *percentileWindowLength* - length of the window to keep track of execution times
- *fallbackTo* - function, which will be executed if the request fails

All of these options have defaults and does not have to be configured. See [HystrixConfig](https://bitbucket.org/igor_sechyn/hystrixjs/src/4cf3ba2dd28eb69481cca384bab21082670c0e00/src/util/HystrixConfig.js) for details. These can be overridden on app startup.

## Executing a command

To execute a command just call the "execute" method and pass the parameters:

```javascript
var promise = serviceCommand.execute(arguments)
```

The *arguments* will be passed into the *run* function and the result will be a promise.

## How to test?

Testing could be tricky, especially because the library introduces state, which could interfere between the single unit tests. In order to avoid this kind of problems the library provides access to the factories producing metrics, circuits and commands. These can be used to reset the state before each test:
```javascript
var commandFactory = require('hystrixjs').commandFactory;
var metricsFactory = require('hystrixjs').metricsFactory;
var circuitFactory = require('hystrixjs').circuitFactory;

metricsFactory.resetCache();
circuitFactory.resetCache();
commandFactory.resetCache();
```

The same problems occur during integration tests, only in this case you cannot access the metrics. I was trying out two different strategies to solve this problem:

- restarting the service under test before each test, which significantly increased the execution time
- adding and calling an endpoint to reset the metrics before each test
