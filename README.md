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

## Instantiating and API

```javascript
var Lime = require('lime');

// instantiate using default options
var dispatcher = new Lime();

// instantiate using custom options
var dispatcher = new Lime({
    delimeter : '|',
    redisHost : '10.0.0.29'
});
```

#### Options

Possible options for Lime are:

*   `delimeter` &mdash; sting "glue" used to concatenate parts of events

### join()

### leave()

### emit()

### on()

### off()

### quit()

## Changelog

### v.0.1.0