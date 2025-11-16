---
title: Optimising WebSocket connections with a SharedWorker
description:
  With a SharedWorker we can share a WebSocket connection across multiple
  browser tabs. Effectively managing connections to the SharedWorker can be
  tricky but these simple strategies ensure stable and efficient connection
  handling.
tags:
  - posts
  - web workers
  - websockets
  - javascript
  - performance
date: 2025-11-14
social_card: shared-worker-websocket-connections.jpg
---

## Using a SharedWorker to share a WebSocket connection

Consider an online shopping site that uses a WebSocket connection to notify
users of events such as order updates, the amount of people viewing the same
item or the status of promotional deals. Users may typically open a few browser
tabs to the same site with different products they are interested in purchasing.
Without a SharedWorker each browser tab creates a WebSocket connection to the
server and as the number of visitors to the site increases, so does the number
of open connections and the load on the server.

Moving the WebSocket connection management to a [SharedWorker][shared-worker]
creates a single connection shared across the user's browser tabs. Each tab
connects to the SharedWorker using a [MessagePort][message-port] and receives
messages from the worker when events occur.

```js
const connections = new Set();
let socket;

// Establish the WebSocket connection
function connectSocket() {
  socket = new WebSocket("wss://example.com/socket");

  socket.addEventListener("message", (event) => {
    broadcast(JSON.parse(event.data));
  });
}

// Broadcast a message to all connected ports
function broadcast(message) {
  connections.forEach((port) => port.postMessage(message));
}

// Handle new connections from clients
onconnect = (ev) => {
  const port = ev.ports[0];
  connections.add(port);

  // Establish the WebSocket connection if not already connected
  if (!socket) {
    connectSocket();
  }
};
```

## Handling client disconnects

The MessagePort API doesn't provide an event for a disconnect. This means that
if a user closes a tab, removing the associated MessagePort from the set of
`connections` becomes problematic.

The client side of the SharedWorker connection needs to notify the worker when
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

The SharedWorker needs to listen for the message and remove the corresponding
MessagePort from the connections set.

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

This works in most cases but is not totally reliable. More on how to deal with
that later.

## Closing the WebSocket connection on visibility change

When the tab becomes invisible, such as when the user switches to another
website tab or minimises the browser, the WebSocket connection might become
unnecessary. To optimize resource usage further, the client can notify the
SharedWorker of visibility changes using the [Page Visibility
API][page-visibility]. Listening for the `visibilitychange` event and sending a
message to the worker indicating whether the document hides or shows.

```js
document.addEventListener("visibilitychange", () => {
  port.postMessage({
    type: "visibilitychange",
    hidden: document.hidden,
  });
});
```

The SharedWorker can handle these visibility change messages to close the
connection when all tabs are hidden and reopen it when at least one tab becomes
visible.

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

The `beforeunload` event is not a totally reliable way to detect and close the
port connection. To ensure the cleanup of closed ports from the connections set,
a heartbeat mechanism becomes necessary. The heartbeat periodically sends a
"ping" message to each connected port. If a port doesn't respond with a "pong"
message before the next ping, remove it.

```js
const lastPongs = new Map();
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

function handleMessage(event) {
  const port = event.target;

  if (event.data.type === "pong") {
    lastPongs.set(port, Date.now());
  } else if (event.data.type === "disconnect") {
    connections.delete(port);
    lastPongs.delete(port);
    port.removeEventListener("message", handleMessage);
  }
}

setInterval(() => {
  connections.forEach((port) => {
    const now = Date.now();
    const lastPong = lastPongs.get(port);

    // If no pong received then consider the port disconnected
    // Skip newly connected ports that haven't received a ping yet
    if (lastPong && now - lastPong > HEARTBEAT_INTERVAL) {
      connections.delete(port);
      lastPongs.delete(port);
      port.removeEventListener("message", handleMessage);
    } else {
      port.postMessage({ type: "ping" });
      // Set initial timestamp for new connections
      if (!lastPong) {
        lastPongs.set(port, now);
      }
    }
  });
}, HEARTBEAT_INTERVAL);

onconnect = (ev) => {
  const port = ev.ports[0];
  connections.add(port);
  port.addEventListener("message", handleMessage);
};
```

## Combining these strategies into SharedWorker utilities

The [shared-worker-utils][shared-worker-utils] package implements these
strategies in small helper classes. In a SharedWorker the PortManager handles
connection management and tracks client state, tab visibility.

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
    // Handle custom messages from clients
    console.log("Custom action received:", message.data);

    // Respond to the client that sent the message
    port.postMessage({
      type: "custom-action-response",
      data: `Received your data: ${message.data}`,
    });
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

On the client side the SharedWorkerClient receives messages from the worker and
sends messages internally when the tab visibility changes.

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

Check the complete example of using the library to manage a WebSocket connection
in the [GitHub repository][github-repo-example].

[github-repo-example]:
  https://github.com/p-m-p/shared-worker-utils/tree/main/packages/example
[message-port]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
[page-visibility]:
  https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
[shared-worker]: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
[shared-worker-utils]: https://github.com/p-m-p/shared-worker-utils
[websocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
