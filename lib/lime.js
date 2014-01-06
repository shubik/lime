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
    var self = this;

    /* --- Set up options --- */

    this.options = _.extend({}, defaultOpts, options || {});
    this._callbacks = {};

    /* --- Set up Redis pub/sub --- */

    this._pub = redis.createClient(this.options.redisPort, this.options.redisHost, this.options.redisOpts),
    this._sub = redis.createClient(redisConf.port, redisConf.host, redisConf.options);

    /* --- Subscribe to and process incoming messages --- */

    this._sub.subscribe(this._redis_key);

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

    this._pub.publish(this.options.redisKey, JSON.stringify(payload));
}

Dispatcher.prototype.on = function() {

    /*
    Possible arguments:
        key, callback
        key, options, callback
        key,..key, callback
        key,..key, options, callback
    */

    var args = Array.prototype.slice.call(arguments),
        callback,
        options,
        evt;

    /* --- Get callback --- */

    if (_.isFunction(_.last(args))) {
        callback = args.pop();
    } else {
        throw new Error('[lime] on(): last argument is not a function');
    }

    /* --- Get options --- */

    if (_.isObject(_.last(args))) {
        options = args.pop();
    } else {
        options = {};
    }

    /* --- Get event hash --- */

    evt = args.join(this.options.delimeter);

    /* --- Add callback --- */

    if (options.replace) {
        this._callbacks[key] = [callback];
    } else {
        this._callbacks[evt] = this._callbacks[evt] || [];
        this._callbacks[evt].push(callback);
    }
}

Dispatcher.prototype.off = function() {
    var args = Array.prototype.slice.call(arguments),
        key  = args.join(this.options.delimeter);

    this._callbacks[key] = [];
}

Dispatcher.prototype.listeners = function() {
    var args = Array.prototype.slice.call(arguments),
        key  = args.join(this.options.delimeter);

    return this._callbacks[key];
}

module.exports = Dispatcher;