Lime
====

Distributed event emitter (aka dispatcher).

## Purpose

Lime is intended to use with Node.js applications running multiple processes of multiple services (such as in SOA) which need to communicate with each other. Lime uses Redis pub/sub capabilities for delivery of messages.

We realize that we do not use both emitters and listeners in the same process. Therefore we use lazy creating Redis clients: "pub" client is created only when `emit()` method is used, and "sub" clients are created when `on()` method is used.

## Installation

### NPM

In your project path:

```javascript
$ npm install lime
```

## Overall concept; why Lime?

## Using Lime; API

### Instantiating dispatcher

### join()

### leave()

### emit()

### on()

### off()

### quit()

## Changelog

### v.0.1.0