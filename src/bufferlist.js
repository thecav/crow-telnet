
var assert = require("assert");


/**
 * Class that holds multiple buffers and presents an interface as
 * though they were all concatenated in a large buffer.  No data
 * from inserted buffers is copied unless the full logically
 * contained buffer is requested.
 *
 *     var a = new Buffer(10);
 *     var b = new Buffer(5);
 *
 *     var buf = new BufferList();
 *     buf.push(a);
 *     buf.push(b);
 *
 *     buf.length === 15;
 *
 *     var fullBuffer = buf.getBuffer(); // copy
 *
 */
function BufferList() {
    this._buffers = [];
}

BufferList.prototype.push = function(buffer) {
    this._buffers.push(buffer);
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
    var result = new Buffer(this.length);
    var index = 0;
    this._buffers.forEach(function(buffer) {
        buffer.copy(result, index);
        index += buffer.length;
    });
    return result;
};

Object.defineProperty(BufferList.prototype, "length", {
    get: function() {
        return this._buffers.reduce(function(previous, current) {
            return previous + current.length;
        }, 0);
    },
    enumerable: true
});


module.exports = BufferList;


