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
disconnects. This means that if a user closes a tab, removing the associated
MessagePort from the `connections` set isn't straightforward.

The client side of the shared worker connection needs to notify the worker when
the tab closes. Listen for the `beforeunload` event and send a message to the
worker to signal that the tab closes.

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

When the tab becomes invisible, such as when the user switches to another tab,
the web socket connection becomes unnecessary. To optimize resource usage, the
client can notify the shared worker of visibility changes using the Page
Visibility API. Listen for the `visibilitychange` event and send a message to
the worker indicating whether the document hides or shows.

```js
document.addEventListener("visibilitychange", () => {
  port.postMessage({
    type: "visibilitychange",
    hidden: document.hidden,
  });
});
```

The shared worker can handle these visibility change messages to manage the web
socket connection. For example, close the connection when all tabs hide and
reopen it when at least one tab becomes visible.

```js
// Keep track of hidden connections
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

## Handling connections that never disconnect

The `beforeunload` event isn't a reliable way to detect and close the port
connection. To ensure the cleanup of closed ports from the `connections` set, a
heartbeat mechanism becomes necessary.

```js
const lastPongs = new Map();
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

setInterval(() => {
  connections.forEach((port) => {
    const lastPong = lastPongs.get(port) || 0;

    // If no pong received in the last 30 seconds, consider the port disconnected
    if (lastPong < Date.now() - HEARTBEAT_INTERVAL) {
      connections.delete(port);
    } else {
      port.postMessage({ type: "ping" });
    }
  });
}, HEARTBEAT_INTERVAL); // Ping every 30 seconds

port.addEventListener("message", (event) => {
  if (event.data.type === "pong") {
    lastPong.set(port, Date.now());
  }
});
```

## Combining these strategies into shared worker utilities

These strategies combine into a super small set of shared worker utilities that
manage connections to a shared worker much like the examples here. The
[shared-worker-utils][shared-worker-utils] Node Package Manager (NPM) package
works in both the shared worker and client app to simplify connection
management.

Create the shared worker with the `PortManager`:

```js
import { PortManager } from "shared-worker-utils";

let socket;

const portManager = new PortManager({
  onActiveCountChange: (activeCount, totalCount) => {
    // Close socket when no active clients, open when clients become active
    if (activeCount === 0 && socket) {
      socket.close();
      socket = null;
    } else if (activeCount > 0 && !socket) {
      connectSocket();
    }
  },
  onMessage: (port, message) => {
    if (message.type === "custom-action") {
      // Handle custom messages from clients
      console.log("Custom action received:", message.data);
    }
  },
});

function connectSocket() {
  socket = new WebSocket("wss://example.com/socket");

  socket.addEventListener("message", (event) => {
    // Broadcast to all connected clients
    portManager.broadcast(JSON.parse(event.data));
  });
}

self.onconnect = (event) => {
  portManager.handleConnect(event.ports[0]);
};
```

Connect from the client side with the `SharedWorkerClient`:

```js
import { SharedWorkerClient } from "shared-worker-utils";

const worker = new SharedWorker("./shared-worker.js", { type: "module" });

const client = new SharedWorkerClient(worker, {
  onMessage: (message) => {
    console.log("WebSocket update:", message.data);
  },
});

// Send custom messages to the worker
client.send({ type: "custom-action", data: "some data" });
```

A full example of using the package to manage web socket exists in the [GitHub
repository][github-repo-example].

[github-repo-example]:
  https://github.com/p-m-p/shared-worker-utils/tree/main/packages/example
[message-port]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
[shared-worker]: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
[shared-worker-utils]: https://github.com/p-m-p/shared-worker-utils
[websocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
