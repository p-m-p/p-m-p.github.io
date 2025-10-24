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
number of browser tabs to the site with different products they're considering
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

Unfortunately, the shared worker doesn't provide a way to detect when a client
disconnects. This means that if a user closes a tab, removing the
associated MessagePort from the `connections` set isn't straightforward.

The client side of the shared worker connection needs to notify the worker when
the tab closes. Listen for the `beforeunload`
event and send a message to the worker to signal that the tab closes.

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

In the shared worker, listen for these disconnect messages and remove the
corresponding MessagePort from the `connections` set.

```js
onconnect = (ev) => {
  const port = ev.ports[0];
  connections.add(port);

  port.addEventListener("message", (event) => {
    if (event.data.type === "disconnect") {
      connections.delete(port);
    }
  });

  if (!socket) {
    connectSocket();
  }
};
```

## Pausing connection on visibility change

When a user switches to a different tab, the browser may throttle or pause
JavaScript execution in the background tab. To ensure that the web socket
connection remains active, listen for the `visibilitychange` event on the
client side and notify the shared worker when the tab becomes hidden or visible.

```js
document.addEventListener("visibilitychange", () => {
  port.postMessage({
    type: "visibilitychange",
    hidden: document.hidden,
  });
});
```

In the shared worker, handle these visibility change messages to manage
the web socket connection accordingly. For example, close the
connection when all tabs hide and reopen it when at least one tab becomes
visible.

```js
let hiddenCount = 0;
onconnect = (ev) => {
  const port = ev.ports[0];
  connections.add(port);

  port.addEventListener("message", (event) => {
    if (event.data.type === "disconnect") {
      connections.delete(port);
    } else if (event.data.type === "visibilitychange") {
      if (event.data.hidden) {
        hiddenCount++;
      } else {
        hiddenCount--;
      }

      if (hiddenCount === connections.size) {
        socket.close();
      } else if (!socket || socket.readyState === WebSocket.CLOSED) {
        connectSocket();
      }
    }
  });

  if (!socket) {
    connectSocket();
  }
};
```

[shared-worker]: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
[websocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
[message-port]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
