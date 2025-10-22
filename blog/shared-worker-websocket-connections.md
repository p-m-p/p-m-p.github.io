---
title: Effectively managing connections to a shared worker
description:
  A shared worker can eliminate multiple web socket or event source connections
  across many tabs by centralizing the connection management. As I recently
  discovered, managing connections to the shared worker can be tricky. Here's
  one approach to solving the problem.
tags:
  - posts
  - web workers
  - websockets
  - javascript
  - performance
date: 2025-10-11
draft: true
---

## Using a shared worker for web socket connections

An online shopping site may use a web socket connection to notify users of
events such as order updates or promotional offers. Users typically open a
number of browser tabs to the site with different products they are considering
purchasing. Each browser tab creates and manages a web socket connection to the
server and uses a heartbeat mechanism to keep the connection alive. As the
number of visitors to the site increases, so does the number of open web socket
connections and the load on the server.

Moving the web socket connection management to a [SharedWorker][shared-worker]
creates a single connection shared across the users open tabs. Each tab connects
to the shared worker using a [MessagePort][message-port] and receives messages
from the worker when events occur.

```js
const connections = new Set();
let socket;

// Establish the WebSocket connection
function connectSocket() {
  socket = new WebSocket("wss://example.com/socket");

  socket.addEventListener("message", (event) => {
    boadcast(event.data);
  });
}

// Broadcast a message to all connected ports
function broadcast(message) {
  connections.forEach((port) => {
    port.postMessage(message);
  });
}

// Handle new connections from clients
onconnect = (ev) => {
  connections.add(ev.ports[0]);

  if (!socket) {
    connectSocket();
  }
};
```

## Handling client disconnections

Unfortunately, the shared worker does not provide a way to detect when a client
(tab) disconnects. This means that if a user closes a tab, removing the
associated MessagePort from the `connections` set is not straightforward.

The client side of the shared worker connection needs to notify the worker when
the tab is closed. This can be achieved by listening for the `beforeunload`
event and sending a message to the worker to indicate that the tab is closing.

```js
const worker = new SharedWorker("shared-worker.js");
const port = worker.port;

port.start();

port.addEventListener("message", (event) => {
  console.log("Received message from worker:", event.data);
});

window.addEventListener("beforeunload", () => {
  port.postMessage({ type: "disconnect" });
});
```

[shared-worker]: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
[websocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
[message-port]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
