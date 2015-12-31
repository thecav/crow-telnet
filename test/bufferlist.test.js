
var assert = require('chai').assert;
var BufferList = require('../src/bufferlist');


describe("BufferList", function() {

    it("breathes", function() {
        assert.isFunction(BufferList);
        assert.deepEqual(Object.keys(BufferList.prototype), [
            "push",
            "clear",
            "get",
            "getBuffer",
            "length"
        ]);

        var bufList = new BufferList();
        assert(bufList.length === 0);
    });

    it("initial state", function() {
        var bufList = new BufferList();

        assert(bufList.length === 0);
        assert(bufList.getBuffer().length === 0);
        assert.throws(function() {
            bufList.get(0);
        });

    });

    it("push", function() {
        var bufList = new BufferList();

        var bufferA = new Buffer([1, 2]);
        var bufferB = new Buffer([20, 21, 22]);

        bufList.push(bufferA);
        assert(bufList.length === 2);

        bufList.push(bufferB);
        assert(bufList.length === 5);

        bufList.push(bufferA);
        assert(bufList.length === 7);
    });

    it("get", function() {
        var bufList = new BufferList();

        assert.throws(function() {
            bufList.get(-1);
        });
        assert.throws(function() {
            bufList.get(0);
        });

        var bufferA = new Buffer([1, 2]);
        var bufferB = new Buffer([20, 21, 22]);

        bufList.push(bufferA);
        assert(bufList.length === 2);
        assert(bufList.get(0) === 1);
        assert(bufList.get(1) === 2);
        assert.throws(function() {
            bufList.get(2);
        });

        bufList.push(new Buffer(0));
        assert(bufList.length === 2);

        bufList.push(bufferB);
        assert(bufList.length === 5);
        assert(bufList.get(0) === 1);
        assert(bufList.get(1) === 2);
        assert(bufList.get(2) === 20);
        assert(bufList.get(3) === 21);
        assert(bufList.get(4) === 22);
        assert.throws(function() {
            bufList.get(5);
        });

        bufList.push(bufferA);
        assert(bufList.length === 7);
        assert(bufList.get(0) === 1);
        assert(bufList.get(1) === 2);
        assert(bufList.get(2) === 20);
        assert(bufList.get(3) === 21);
        assert(bufList.get(4) === 22);
        assert(bufList.get(5) === 1);
        assert(bufList.get(6) === 2);
        assert.throws(function() {
            bufList.get(7);
        });

    });

    it("clear", function() {
        var bufferA = new Buffer([1, 2]);
        var bufferB = new Buffer([20, 21, 22]);

        var bufList = new BufferList();
        assert(bufList.length === 0);

        bufList.clear();
        assert(bufList.length === 0);

        bufList.push(bufferA);
        assert(bufList.length === 2);
        bufList.clear();
        assert(bufList.length === 0);

        bufList.push(bufferA);
        bufList.push(bufferB);
        assert(bufList.length === 5);
        bufList.clear();
        assert(bufList.length === 0);

    });

    it("getBuffer", function() {
        var bufList = new BufferList();
        assert(bufList.length === 0);
        assert(bufList.getBuffer().length === 0);

        var bufferA = new Buffer([1, 2]);
        var bufferB = new Buffer([20, 21, 22]);

        bufList.push(bufferA);
        assert(bufferA.compare(bufList.getBuffer()) === 0);

        bufList.push(bufferB);
        var combined = new Buffer([1, 2, 20, 21, 22]);
        assert(combined.compare(bufList.getBuffer()) === 0);

        bufList.clear();
        assert(bufList.getBuffer().length === 0);
    });

});
