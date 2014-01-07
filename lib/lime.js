var _           = require('lodash'),
    redis       = require('redis'),
    defaultOpts = {
        delimeter   : '::',
        keyBase     : 'app:dispatcher',
        defaultRoom : 'default',
        redisHost   : 'localhost',
        redisPort   : 6379,
        redisOpts   : {}
    },
    execCallbacks,
    Dispatcher;

execCallbacks = function(callbacks, key, data) {
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
    this.options   = _.extend({}, defaultOpts, options || {});
    this._events   = {};
    this._rooms    = {};
    this._redisSubscribers = {};
}

/* --- "Private" methods --- */

Dispatcher.prototype._joinRoom = function(room) {
    this._rooms[room] = this.options.keyBase + this.options.delimeter + room;
}

Dispatcher.prototype._leaveRoom = function(room) {
    delete this._rooms[room];
}

Dispatcher.prototype._leaveAllRooms = function() {
    this._rooms = {};
}

Dispatcher.prototype._emitToRoom = function(channel, evt, payload) {
    this._redisPub = this._redisPub || redis.createClient(this.options.redisPort, this.options.redisHost, this.options.redisOpts);
    this._redisPub.publish(channel, JSON.stringify(payload));
}

Dispatcher.prototype._subscribeToAllRooms = function() {
    var self = this;

    _.each(this._rooms, function(channel, room) {
        if (!self._redisSubscribers[room]) {
            self._subscribeToRoom(room);
        }
    });
}

Dispatcher.prototype._subscribeToRoom = function(room) {
    var self = this,
        redisChannel = this.options.keyBase + this.options.delimeter + room;

    this._redisSubscribers[room] = redis.createClient(this.options.redisPort, this.options.redisHost, this.options.redisOpts);
    this._redisSubscribers[room].subscribe(redisChannel);

    this._redisSubscribers[room].on('message', function(ch, data) {
        var data    = JSON.parse(data),
            evt     = data.evt,
            payload = data.payload;

        _.each(self._events, function(callbacks, evt) {
            var keys  = evt.split(self.options.delimeter),
                match = _.reduce(keys, function(memo, _key) {
                    var pattern = new RegExp(_key.replace(/\*/gi, '(.*)', 'gi'), 'gi');
                    memo = memo && evt.match(pattern);
                    return memo;
                }, true);

            match ? execCallbacks(callbacks, evt, payload) : 0;
        });
    });

    this._redisSubscribers[room].on('unsubscribe', function() {
        this._redisSubscribers[room].quit();
        delete this._redisSubscribers[room];
    });
}

Dispatcher.prototype._unsubscribeFromRoom = function(room) {
    if (this._redisSubscribers[room]) {
        var redisChannel = this.options.keyBase + this.options.delimeter + room;
        this._redisSubscribers[room].unsubscribe(redisChannel);
    }
}

/* --- API --- */

Dispatcher.prototype.join = function(room) {
    room = room || this.options.defaultRoom;
    this._joinRoom(room);
    return this;
}

Dispatcher.prototype.leave = function(room) {
    room ? this._leaveRoom(room) : this._leaveAllRooms();
    return this;
}

Dispatcher.prototype.emit = function() {
    var self    = this,
        args    = Array.prototype.slice.call(arguments),
        data    = args.pop(),
        evt     = args.join(this.options.delimeter),
        payload = {
            evt     : evt,
            payload : data
        };

    _.each(this._rooms, function(channel) {
        self._emitToRoom(channel, evt, payload);
    });

    return this;
}

Dispatcher.prototype.on = function() {
    var args     = Array.prototype.slice.call(arguments),
        callback = args.pop(),
        evt      = args.join(this.options.delimeter);

    this._events[evt] = this._events[evt] || [];
    this._events[evt].push(callback);

    this._subscribeToAllRooms();

    return this;
}

Dispatcher.prototype.off = function() {
    var args = Array.prototype.slice.call(arguments),
        evt  = args.join(this.options.delimeter);

    return this;
}

Dispatcher.prototype.rooms = function() {
    return this._rooms.length;
}

Dispatcher.prototype.listeners = function() {
    return this._events.length;
}

Dispatcher.prototype.quit = function() {
    _.each(this._redisSubscribers, function(redisClient) {
        redisClient.quit();
    });

    this._redisPub ? this._redisPub.quit() : 0;

    delete this._events;
    delete this._rooms;
}

module.exports = Dispatcher;