Lime
====

Distributed event emitter (aka dispatcher).

## Purpose

Lime is intended to use with Node.js applications running multiple processes of multiple services (such as in SOA) which need to communicate with each other. Lime uses Redis pub/sub capabilities for delivery of messages.

We realize that we do not always use both emitters and listeners in the same process. Therefore we use lazy creating Redis clients: "pub" client is created only when `emit()` method is used, and "sub" clients are created when `on()` method is used.

## Installation

### NPM

In your project path:

```javascript
$ npm install lime
```

## Overall concept and use case

*   You are building a cloud-based SOA application with services running on multiple threads
*   In your applications events can be described as belonging to domains or rooms, e.g. events related to specific entities &mdash; users, companies, topics, etc.
*   You are able to use a dedicated instance for Redis server
*   Parts of your application do not necessarily reside on the same network as other services and need other means of delivering events, such as net/TLS sockets
*   You want to use wildcards `*` when subscribing to events

## Instantiating and API

```javascript
var Lime = require('lime');

// instantiate using default options
var dispatcher = new Lime;

// instantiate using some custom options
var dispatcher = new Lime({
    delimeter : '~',
    redisHost : '10.0.0.29'
});
```

#### Options

Possible options for Lime are:

*   `delimeter` &mdash; sting "glue" used to concatenate parts of events by emitters and by subscribers
*   `keyBase` &mdash; base of the key for Redis; room name will be added to this string
*   `defaultRoom` &mdash; default room name to be used if room name was not used in `join()` method
*   `redisHost`  &mdash; host of Redis server
*   `redisPort`  &mdash; port of Redis server
*   `redisOpts`  &mdash; options for Node.js Redis client

### join(room)

Adds dispatcher to a room. Examples:

```javascript
disp.join('company.12345'); // will join room "company.12345"
disp.join(); // will join default room
```

This method is chainable.

### leave(*room)

Removes dispatcher from a room. Examples:

```javascript
disp.leave('company.234'); // will leave room and will unsubscribe from corresponding Redis channel
disp.leave(); // will leave all rooms
```

This method is chainable.

### emit(*event, payload)

Emits event to joined rooms. Examples:

```javascript
disp.emit('hello-world', { foo: 'bar' }); // emits event "hello-world"
disp.emit('galaxy.123', 'hello-world', { foo: 'bar' }); // emits event "galaxy.123::hello-world" if delimeter is set to "::"
```

This method is chainable.

### on(*event, [options], callback)

Adds listener for an event. Examples:

```javascript
disp.on('hello-world', cb); // will be triggered by event "hello-world"
disp.on('company.*', cb); // will be triggered by events "company.1234", "company.Foo" etc.
disp.on('hello-world', 'galaxy.*', cb); // will be triggered by events "galaxy.123::hello-world" or "hello-world::galaxy.Milky Way", and so on
disp.on('*', cb); // will be triggered by all events
```

#### Options

*   `boundary` (boolean, defaults to `FALSE`) &mdash; if set to `true`, than beginning and end of input markers will be used, and entire string will need to match;
*   `replace` (boolean, defaults to `FALSE`) &mdash; if set to `true`, than all queued callbacks will be replaced with the current one.

For example:

```javascript
disp.on('age:36', cb); // will execute
disp.on('name:alex::age:*', { boundary: true }, cb); // will execute
disp.on('name:alex', 'age:36', { boundary: true }, cb); // will execute

disp.on('age:36', { boundary: true }, cb); // will not match
disp.on('name:*', { boundary: true }, cb); // will not match

disp.emit('name:alex::age:36', 'Just say Yes');
```

#### Callbacks

Callbacks will be executed with different arguments depending on their expected arguments:

*   If callback expects 0 arguments, it will be executed without any;
*   If callback expects 1 argument, it will be executed with event payload only;
*   If callback expects 2 arguments, it will be executed with event name and event payload.

Examples:

```javascript
disp.on('foo', function() { ... }); // will be executed sans arguments
disp.on('foo', function(data) { ... }); // will be executed with event payload
disp.on('foo', function(evt, data) { ... }); // will be executed with event name and payload
```

This method is chainable.

### off(*event)

Removes listeners for provided event. Examples:

```javascript
disp.off('hello-world'); // removes callbacks for "hello-world" event
disp.off('galaxy.123', 'hello-world'); // removes callbacks for "galaxy.123::hello-world" event if delimeter is set to "::"
```

This method is chainable.

### quit()

Removes callbacks for all events and quits all currently used Redis clients.

This method is not chainable.

## Examples

```javascript
/*
Emitter
*/

var Lime = require('lime'),
    disp = new Lime({ redisHost: '10.0.0.1' });

disp
    .join('company:345')
    .emit('user:123', 'model:company', 'event:update', { active: false })
    .quit();
```

```javascript
/*
Subscriber A
*/

var Lime = require('lime'),
    disp = new Lime({ redisHost: '10.0.0.1' });
```

```javascript
/*
Subscriber B
*/

var Lime = require('lime'),
    disp = new Lime({ redisHost: '10.0.0.1' });
```

```javascript
/*
Subscriber C
*/

var Lime = require('lime'),
    disp = new Lime({ redisHost: '10.0.0.1' });
```

## Changelog

*   v.0.1.1 &mdash; Added options to `.on()` method
*   v.0.1.0 &mdash; Initial library