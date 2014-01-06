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

}

Dispatcher = function(options) {
    var self = this;

    this.options = _.extend({}, defaultOpts, options || {});
    this._callbacks = {};

    this._pub = redis.createClient(this.options.redisPort, this.options.redisHost, this.options.redisOpts),
    this._sub = redis.createClient(redisConf.port, redisConf.host, redisConf.options);

    this._sub.setMaxListeners(0);
    this._sub.subscribe(this._redis_key);

    this._sub.on('message', function(ch, data) {
        var payload = JSON.parse(data);

        _.each(self._callbacks, function(callbacks, key) {
            var pattern = new RegExp(key.replace(/\*/gi, '(.*)', 'gi'), 'gi');
            payload.key.match(pattern) ? execCallbacks(callbacks, payload.key, payload.data) : 0;
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
        throw new Error('Dispatcher emit(): last argument is not a function');
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

module.exports = Dispatcher;