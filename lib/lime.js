var _              = require('lodash'),
    redis          = require('redis'),
    DELIMETER      = '~',
    dispatcherOpts = {
        delimeter   : '::',
        keyBase     : 'app:dispatcher',
        defaultRoom : 'default',
        redisHost   : 'localhost',
        redisPort   : 6379,
        redisOpts   : {}
    },
    eventOpts      = {
        replace  : false,
        boundary : false
    },
    execCallbacks,
    Dispatcher;

/**
Executes callbacks added by listeners
@function execCallbacks
@param {Array} callbacks Callbacks to execute
@param {String} evt Name of event that was matched
@param {Object} data Payload of event to pass to callbacks
*/

execCallbacks = function(callbacks, evt, data) {
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
                cb(evt, data);
        }
    });
}

/**
Constructor for the event dispatcher dispatcher
@class Dispatcher
@constructor
@param {Object} [options] optional params for dispatcher which will override default params
    @param {String} [options.delimeter] "glue" for joining parts of event name to an event hash
    @param {String} [options.keyBase] string to which room name is appended to generate key for Redis pub/sub
    @param {String} [options.defaultRoom] name of default room if user did not specify room name when joining it - TBD
    @param {String} [options.redisHost] host of Redis server
    @param {Number} [options.redisPort] port of Redis server
    @param {Object} [options.redisOpts] options for Redis client
*/

Dispatcher = function(options) {
    this.options = _.extend({}, dispatcherOpts, options || {});
    this._events = {};
    this._rooms  = {};
    this._redisSubscribers = {};
}

/**
Adds instance of dispatcher to a room. If there are already added listeners - also subscribe to Redis channel.
@method _joinRoom
@private
@param {String} room Name of the room we want dispatcher to join, e.g. "company.123"
*/

Dispatcher.prototype._joinRoom = function(room) {
    this._rooms[room] = this.options.keyBase + this.options.delimeter + room;

    /* --- If there are events - subscribe to events in this room --- */

    if (_.size(this._events) > 0) {
        this._subscribeToRoom(room);
    }
}

/**
Removes instance of dispatcher from a room
@method _leaveRoom
@private
@param {String} room Name of the room we want dispatcher to join, e.g. "company.123"
*/

Dispatcher.prototype._leaveRoom = function(room) {
    this._unsubscribeFromRoom(room);
    delete this._rooms[room];
}

/**
Removes instance of dispatcher from all joined rooms
@method _leaveAllRooms
@private
*/

Dispatcher.prototype._leaveAllRooms = function() {
    var self = this;

    _.each(this._rooms, function(channel, room) {
        self._unsubscribeFromRoom(room);
        delete self._rooms[room];
    });
}

/**
Publishes event to Redis to a channel corresponding a room
@method _emitToRoom
@private
@param {String} channel Redis channel to which we will send the message
@param {String} evt Name of event we want to publish
@param {Mixed} payload Payload of event. Must be JSON-stringifyable
*/

Dispatcher.prototype._emitToRoom = function(channel, evt, payload) {
    this._redisPub = this._redisPub || redis.createClient(this.options.redisPort, this.options.redisHost, this.options.redisOpts);
    this._redisPub.publish(channel, JSON.stringify(payload));
}

/**
When listener is added we want to make sure that all previously joined rooms also subscribe to Redis channel
@method _subscribeToAllRooms
@private
*/

Dispatcher.prototype._subscribeToAllRooms = function() {
    var self = this;

    _.each(this._rooms, function(channel, room) {
        if (!self._redisSubscribers[room]) {
            self._subscribeToRoom(room);
        }
    });
}

/**
Method for subscribing to Redis channel for individual room, as well as for handling unsubscribe from that channel
@method _subscribeToRoom
@private
@param {String} room Room name for which we want to add Redis listener
*/

Dispatcher.prototype._subscribeToRoom = function(room) {
    var self = this,
        redisChannel = this.options.keyBase + this.options.delimeter + room;

    this._redisSubscribers[room] = redis.createClient(this.options.redisPort, this.options.redisHost, this.options.redisOpts);
    this._redisSubscribers[room].subscribe(redisChannel);

    /* --- Handle incoming events for this "room" --- */

    this._redisSubscribers[room].on('message', function(ch, data) {
        var msgData    = JSON.parse(data),
            msgEvt     = msgData.e,
            msgPayload = msgData.p;

        _.each(self._events, function(callbacks, key) {
            var keyParts = key.split(DELIMETER),
                evt = keyParts[0],
                options = JSON.parse(keyParts[1]);

            if (options.boundary) {
                var query = '^' + evt + '$',
                    pattern = new RegExp(query.replace(/\*/gi, '(.*)', 'gi'), 'gi'),
                    match = msgEvt.match(pattern);
            } else {
                var queries = evt.split(self.options.delimeter),
                    pattern,
                    match = _.reduce(queries, function(memo, query) {
                        pattern = new RegExp(query.replace(/\*/gi, '(.*)', 'gi'), 'gi');
                        memo = memo && msgEvt.match(pattern);
                        return memo;
                    }, true);
            }

            match ? execCallbacks(callbacks, msgEvt, msgPayload) : 0;
        });
    });

    /* --- Handle clients that we want to unsubscribe --- */

    this._redisSubscribers[room].on('unsubscribe', function() {
        self._redisSubscribers[room].quit();
        delete self._redisSubscribers[room];
    });
}

/**
Method from unsubscribing from Redis channel for individual rooms
@method _unsubscribeFromRoom
@private
@param {String} room Room name for which we want to remove Redis listener
*/

Dispatcher.prototype._unsubscribeFromRoom = function(room) {
    if (this._redisSubscribers[room]) {
        this._redisSubscribers[room].unsubscribe(this._rooms[room]);
    }
}

/**
Adds instance of dispatcher to a room
@method join
@static
@chainable
@param {String} room Room name which we want to join
*/

Dispatcher.prototype.join = function(room) {
    room = room || this.options.defaultRoom;
    this._joinRoom(room);
    return this;
}

/**
Allows to leave individual rooms or all rooms at once
@method leave
@static
@chainable
@param {String} room Room name which we want to leave; if not passed - will be removed from all rooms
*/

Dispatcher.prototype.leave = function(room) {
    room ? this._leaveRoom(room) : this._leaveAllRooms();
    return this;
}

/**
Emits event to all joined rooms
@method emit
@static
@chainable
*/

Dispatcher.prototype.emit = function() {
    var self    = this,
        args    = Array.prototype.slice.call(arguments),
        data    = args.pop(),
        evt     = args.join(this.options.delimeter),
        payload = {
            e : evt,
            p : data
        };

    _.each(this._rooms, function(channel) {
        self._emitToRoom(channel, evt, payload);
    });

    return this;
}

/**
Adds callback to an event. Callback will be triggered when matching event comes to any of joined room
@method on
@static
@chainable
*/

Dispatcher.prototype.on = function() {
    var args     = Array.prototype.slice.call(arguments),
        callback = args.pop(),
        options  = args.pop(),
        evt,
        key;

    if (!_.isFunction(callback)) {
        throw new Error('Lime .on(): Last argument must be a function');
    }

    if (!_.isObject(options)) {
        args.push(options);
        options = {};
    }

    evt = args.join(this.options.delimeter);

    if (evt.length === 0) {
        throw new Error('Lime .on(): Event name can not be empty');
    }

    options = _.extend({}, eventOpts, options);
    key = evt + DELIMETER + JSON.stringify(options);

    /* --- Check if user wants to replace current listener --- */

    if (options.replace) {
        this._events[key] = [callback];
    } else {
        this._events[key] = this._events[key] || [];
        this._events[key].push(callback);
    }

    /* --- Make sure dispatcher is subscribed to Redis channels for all rooms --- */

    this._subscribeToAllRooms();

    return this;
}

/**
Removes listener for an event
@method off
@static
@chainable
*/

Dispatcher.prototype.off = function() {
    var args = Array.prototype.slice.call(arguments),
        evt  = args.join(this.options.delimeter);

    delete this._events[evt];
    return this;
}

/**
Returns number of joined rooms
@method rooms
@static
*/

Dispatcher.prototype.rooms = function() {
    return _.size(this._rooms);
}

/**
Returns number of added events
@method listeners
@static
*/

Dispatcher.prototype.listeners = function() {
    return _.size(this._events);
}

/**
Removes all listeners, quits all Redis clients
@method quit
@static
*/

Dispatcher.prototype.quit = function() {
    _.each(this._redisSubscribers, function(redisClient) {
        redisClient.quit();
    });

    this._redisPub ? this._redisPub.quit() : 0;

    this._events = {};
    this._rooms = {};
}

module.exports = Dispatcher;