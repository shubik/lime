var _           = require('lodash'),
    redis       = require('redis'),
    defaultOpts = {
        delimeter : '::',
        redisKey  : 'app:dispatcher',
        redisHost : 'localhost',
        redisPort : 6379,
        redisOpts : {}
    },
    execCallbacks,
    Dispatcher;

execCallbacks = function(callbacks, key, payload) {
    _.each(callbacks, function(cb) {
        switch (cb.length) {
            case 0:
                cb();
                break;

            case 1:
                cb(data);
                break;

            case 2:
            default:
                cb(key, data);
        }
    });
}

Dispatcher = function(options) {
    this.options    = _.extend({}, defaultOpts, options || {});
    this._callbacks = {};
    this._rooms     = {};
}

Dispatcher.prototype._initSub = function() {
    if (this._sub) {
        return;
    }

    var self = this;

    /* --- Set up Redis sub --- */

    this._sub = redis.createClient(redisConf.port, redisConf.host, redisConf.options);
    this._sub.subscribe(this.options.redisKey);

    /* --- Subscribe to and process incoming messages --- */

    this._sub.on('message', function(ch, data) {
        var payload = JSON.parse(data);

        _.each(self._callbacks, function(callbacks, key) {
            var keys = key.split(self.options.delimeter),
                match = _.reduce(keys, function(memo, _key) {
                    var pattern = new RegExp(_key.replace(/\*/gi, '(.*)', 'gi'), 'gi');
                    memo = memo && payload.key.match(pattern);
                    return memo;
                }, true);

            match ? execCallbacks(callbacks, payload.key, payload.data) : 0;
        });
    });
}

Dispatcher.prototype.emit = function() {
    var args    = Array.prototype.slice.call(arguments),
        data    = args.pop(),
        key     = args.join(this.options.delimeter),
        payload = {
            key     : key,
            payload : data
        };

    this._pub = this._pub || redis.createClient(this.options.redisPort, this.options.redisHost, this.options.redisOpts);
    this._pub.publish(this.options.redisKey, JSON.stringify(payload));
}

Dispatcher.prototype.on = function() {
    var args     = Array.prototype.slice.call(arguments),
        callback = args.pop(),
        evt      = args.join(this.options.delimeter);

    this._initSub();
    this._callbacks[evt] = this._callbacks[evt] || [];
    this._callbacks[evt].push(callback);
}

Dispatcher.prototype.off = function() {
    var args = Array.prototype.slice.call(arguments),
        evt  = args.join(this.options.delimeter);

    this._initSub();
    this._callbacks[evt] = [];
}

Dispatcher.prototype.removeAllListeners = function() {
    var args = Array.prototype.slice.call(arguments),
        evt  = args.join(this.options.delimeter);

    if (evt.length > 0) {
        this._callbacks[evt] = [];
    } else {
        this._callbacks = {};
    }
}

Dispatcher.prototype.listeners = function() {
    var args = Array.prototype.slice.call(arguments),
        evt  = args.join(this.options.delimeter);

    return this._callbacks[evt];
}

Dispatcher.prototype.join = function() {

}

Dispatcher.prototype.leave = function() {

}

Dispatcher.prototype.quit = function() {
    this._callbacks = null;
    this._rooms = null;
    this._pub ? this._pub.quit() : 0;
    this._sub ? this._sub.quit() : 0;
}

module.exports = Dispatcher;