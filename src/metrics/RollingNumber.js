import ActualTime from "../util/ActualTime";
import Bucket from "./CounterBucket";

class RollingNumber {

    constructor({timeInMillisecond = 10000, numberOfBuckets = 10} = {}) {
        this.windowLength = timeInMillisecond;
        this.numberOfBuckets = numberOfBuckets;
        this.buckets = [];
    }

    get bucketSizeInMilliseconds() {
        return this.windowLength / this.numberOfBuckets;
    }

    increment(type) {
        this.getCurrentBucket().increment(type);
    }

    getCurrentBucket() {
        let currentTime = ActualTime.getCurrentTime();

        if (this.buckets.length === 0) {
            let newBucket = new Bucket(currentTime);
            this.buckets.push(newBucket);
            return newBucket;
        }

        let currentBucket = this.buckets[this.buckets.length-1];
        if (currentTime > (currentBucket.windowStart + this.windowLength)) {
            this.reset();
            return this.getCurrentBucket();
        }
        if (currentTime < (currentBucket.windowStart + this.bucketSizeInMilliseconds)) {
            return currentBucket;
        } else {
            this.rollWindow(currentTime);
            return this.getCurrentBucket();
        }
    }

    rollWindow(currentTime) {
        let newBucket = new Bucket(currentTime);
        if (this.buckets.length == this.numberOfBuckets) {
            this.buckets.shift();
        }
        this.buckets.push(newBucket);
    }

    getRollingSum(type) {
        let sum = 0;
        for (var bucket of this.buckets) {
            sum += bucket.get(type);
        }
        return sum;
    }

    reset() {
        this.buckets = [];
    }
}

export default RollingNumber;