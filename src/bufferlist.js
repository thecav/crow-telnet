'use strict';

var assert = require("assert");
var util = require("util");

/**
 * Class that holds multiple buffers and presents them as
 * though they were all concatenated in a large buffer.
 * However, no data from the inserted buffers is copied
 * unless the full logically contained buffer is requested.
 *
 *     var a = new Buffer(10);
 *     var b = new Buffer(5);
 *
 *     var buf = new BufferList();
 *     buf.push(a);
 *     buf.push(b);
 *
 *     assert(buf.length === 15);
 *
 *     var fullBuffer = buf.getBuffer(); // copy
 *
 */
function BufferList() {
    this._buffers = [];
}

// PUBLIC METHODS

BufferList.prototype.push = function(buffer) {
    this._buffers.push(buffer);
};

BufferList.prototype.pop = function(amount) {
    assert(typeof amount === "number");
    assert(amount >= 0);
    assert(this.length - amount >= 0, "Popping too much, amount: " + amount + ", length: " + this.length);

    for (var i = this._buffers.length - 1; i >= 0; --i) {
        var buf = this._buffers[i];
        if (amount <= buf.length) {
            this._buffers[i] = buf.slice(0, buf.length - amount);
            break;
        }
        else {
            amount -= buf.length;
            this._buffers.length = this._buffers.length - 1;
        }
    }
};

BufferList.prototype.clear = function() {
    this._buffers.length = 0;
};

BufferList.prototype.get = function(index) {
    assert(index >= 0);

    for (var i = 0; i < this._buffers.length; ++i) {
        var buf = this._buffers[i];
        if (index < buf.length) {
            return buf[index];
        }
        index -= buf.length;
    }

    assert(false, "Index out of range", index);
};

BufferList.prototype.getBuffer = function() {
    // Special case if we only hold one buffer to just return it
    // No need to allocate and copy into a new one
    if (this._buffers.length === 1) {
        return this._buffers[0];
    }

    var result = new Buffer(this.length);
    var index = 0;
    this._buffers.forEach(function(buffer) {
        buffer.copy(result, index);
        index += buffer.length;
    });
    return result;
};

BufferList.prototype.toString = function() {
    return this.getBuffer().toString();
};

BufferList.prototype.inspect = function() {
    return util.inspect(this.getBuffer());
};

// PUBLIC PROPERTIES

Object.defineProperty(BufferList.prototype, "length", {
    get: function() {
        return this._buffers.reduce(function(previous, current) {
            return previous + current.length;
        }, 0);
    },
    enumerable: true
});


module.exports = BufferList;


