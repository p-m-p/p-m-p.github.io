---
title: Optimising websocket connections with a shared worker
description:
  Shared workers are a good way to limit the number of websocket connections
  across multiple browser tabs. Managing connections to the shared worker can be
  tricky, here's a few patterns that can help.
tags:
  - posts
  - web workers
  - websockets
  - javascript
  - performance
date: 2025-10-11
draft: true
---

## Using a shared worker for a websocket connection

Consider an online shopping site that uses a web socket connection to notify
users of events such as order updates, the amount people viewing the same item
or the status of promotional deals. Users typically open a few browser tabs to
the same site with different products they're considering purchasing. Each
browser tab creates a web socket connection to the server and as the number of
visitors to the site increases, so does the number of open web socket
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
  const port = ev.ports[0];
  connections.add(port);

  if (!socket) {
    connectSocket();
  }

  // Optionally handle messages from the port and send to the websocket
  port.addEventListener("message", (event) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(event.data);
    }
  });
};
```

## Handling client disconnections

The MessagePort API doesn't provide an event for when a client disconnects. This
means that if a user closes a tab, removing the associated MessagePort from the
set of `connections` becomes problematic.

The client side of the shared worker connection needs to notify the worker when
the tab closes. Listening for the `beforeunload` event and sending a specific
message to the worker to signal that the tab closed.

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

The shared worker listens for the message and removes the corresponding
MessagePort from the `connections` set.

```js
onconnect = (ev) => {
  const port = ev.ports[0];
  connections.add(port);

  if (!socket) {
    connectSocket();
  }

  port.addEventListener("message", (event) => {
    if (event.data.type === "disconnect") {
      connections.delete(port);
    }
  });
};
```

This works in most cases but isn't totally reliable. More on that later.

## Pausing connection on visibility change

When the tab becomes invisible, such as when the user switches to another tab or
window, the web socket connection becomes unnecessary. To optimize resource
usage, the client can notify the shared worker of visibility changes using the
[Page Visibility API][page-visibility]. Listening for the `visibilitychange`
event and sending a message to the worker indicating whether the document hides
or shows.

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

  if (!socket) {
    connectSocket();
  }

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
};
```

## Handling dead connections that never send a disconnect

The `beforeunload` event isn't a totally reliable way to detect and close the
port connection. To ensure the cleanup of closed ports from the `connections`
set, a heartbeat mechanism becomes necessary.

```js
const lastPongs = new Map();
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds

setInterval(() => {
  connections.forEach((port) => {
    const lastPong = lastPongs.get(port) || 0;

    // If no pong received the consider the port disconnected
    if (Date.now() - lastPong > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT) {
      connections.delete(port);
    } else {
      port.postMessage({ type: "ping" });
    }
  });
}, HEARTBEAT_INTERVAL);

port.addEventListener("message", (event) => {
  if (event.data.type === "pong") {
    lastPong.set(port, Date.now());
  }
});
```

## Combining these strategies into shared worker utilities

This small NPM package combines these strategies,
[shared-worker-utils][shared-worker-utils]. In the shared worker the port
manager handles connection management and is notified of tab visibility changes.

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

On the client side the shared worker client receives messages from the worker.

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

Check the complete example of using the library to manage a web socket
connection in the [GitHub repository][github-repo-example].

[github-repo-example]:
  https://github.com/p-m-p/shared-worker-utils/tree/main/packages/example
[message-port]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
[page-visibility]:
  https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
[shared-worker]: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
[shared-worker-utils]: https://github.com/p-m-p/shared-worker-utils
[websocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
