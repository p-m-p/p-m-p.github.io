---
title: Sharing a web socket connection with a shared worker
description:
  Managing WebSocket connections efficiently across browser tabs requires
  coordination to avoid resource waste and connection limits. This post
  demonstrates how shared workers centralize WebSocket management, providing a
  single connection that serves all tabs while handling reconnection and state
  synchronization seamlessly.
tags:
  - posts
  - web workers
  - websockets
  - javascript
  - performance
date: 2025-10-11
draft: true
---

## The problem with many WebSocket connections

Opening many tabs of the same web app often results in each tab creating its own
WebSocket connection to the server. This approach creates many issues:

- **Resource waste**: Many connections to the same endpoint consume unnecessary
  server resources
- **Connection limits**: Browsers and servers impose limits on concurrent
  connections
- **Inconsistent state**: Each tab maintains its own connection state, leading
  to synchronization issues
- **Increased latency**: Many connections can compete for bandwidth and increase
  latency

Using a shared worker to maintain a single WebSocket connection solves this by
serving all tabs of the same origin.

## Shared workers for connection management

Shared workers run in a separate thread and persist across many browsing
contexts from the same origin. Unlike dedicated workers that belong to a single
tab, shared workers continue running even when individual tabs close, making
them ideal for managing persistent connections.

## Project structure and code separation

For maintainable code, separate concerns into different modules. This structure
allows for better testing, reuse, and bundling:

```
src/
├── worker/
│   ├── shared-websocket-worker.js    # Entry point
│   ├── websocket-manager.js          # Core WebSocket logic
│   ├── connection-monitor.js         # Connection health monitoring
│   └── message-handler.js            # Message routing and validation
├── client/
│   └── websocket-client.js           # Client-side wrapper
└── types/
    └── messages.js                   # Shared message types
```

The WebSocket manager handles the core connection logic:

```js
// src/worker/websocket-manager.js
export class WebSocketManager {
  constructor() {
    this.websocket = null;
    this.connectionState = "disconnected";
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.lastUrl = null;
  }

  connect(url) {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.lastUrl = url;
    this.websocket = new WebSocket(url);
    this.setupWebSocketHandlers();
  }

  setupWebSocketHandlers() {
    this.websocket.addEventListener("open", () => {
      this.connectionState = "connected";
      this.reconnectAttempts = 0;
      this.onConnectionChange?.("connected");
      this.flushMessageQueue();
    });

    this.websocket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      this.onMessage?.(data);
    });

    this.websocket.addEventListener("close", () => {
      this.connectionState = "disconnected";
      this.onConnectionChange?.("disconnected");
      this.attemptReconnect();
    });

    this.websocket.addEventListener("error", (error) => {
      this.onError?.(error.message);
    });
  }

  setCallbacks({ onMessage, onConnectionChange, onError }) {
    this.onMessage = onMessage;
    this.onConnectionChange = onConnectionChange;
    this.onError = onError;
  }

  sendMessage(data) {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    } else {
      // Queue messages when disconnected
      this.messageQueue.push(data);
    }
  }

  close() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.lastUrl) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.lastUrl);
      }, delay);
    }
  }
}
```

The port manager handles communication with browser tabs:

```js
// src/worker/port-manager.js
export class PortManager {
  constructor() {
    this.ports = new Set();
  }

  addPort(port) {
    this.ports.add(port);
    port.start();
    return port;
  }

  removePort(port) {
    this.ports.delete(port);
  }

  broadcast(message) {
    this.ports.forEach((port) => {
      port.postMessage(message);
    });
  }

  isEmpty() {
    return this.ports.size === 0;
  }
}
```

The shared worker entry point coordinates everything:

```js
// src/worker/shared-websocket-worker.js
import { WebSocketManager } from "./websocket-manager.js";
import { PortManager } from "./port-manager.js";

class SharedWebSocketController {
  constructor() {
    this.wsManager = new WebSocketManager();
    this.portManager = new PortManager();
    this.setupCallbacks();
  }

  setupCallbacks() {
    this.wsManager.setCallbacks({
      onMessage: (data) => {
        this.portManager.broadcast({ type: "message", data });
      },
      onConnectionChange: (state) => {
        this.portManager.broadcast({ type: "connection", state });
      },
      onError: (error) => {
        this.portManager.broadcast({ type: "error", error });
      },
    });
  }

  handlePortMessage(message, port) {
    switch (message.type) {
      case "connect":
        this.wsManager.connect(message.url);
        break;
      case "send":
        this.wsManager.sendMessage(message.data);
        break;
      case "disconnect":
        this.portManager.removePort(port);
        if (this.portManager.isEmpty()) {
          this.wsManager.close();
        }
        break;
    }
  }

  addPort(port) {
    this.portManager.addPort(port);

    // Send current connection state
    port.postMessage({
      type: "connection",
      state: this.wsManager.connectionState,
    });

    port.addEventListener("message", (event) => {
      this.handlePortMessage(event.data, port);
    });
  }
}

const controller = new SharedWebSocketController();

self.addEventListener("connect", (event) => {
  const port = event.ports[0];
  controller.addPort(port);
});
```

## Bundling the worker

Modern build tools can compile these separate modules into a single worker file.
Using a build tool as an example:

```js
// vite.config.js
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "./src/main.js",
        worker: "./src/worker/shared-websocket-worker.js",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === "worker"
            ? "shared-websocket-worker.js"
            : "[name]-[hash].js";
        },
      },
    },
  },
  worker: {
    format: "es",
  },
});
```

For other build tools, use a separate entry point:

```js
// webpack.config.js
module.exports = {
  entry: {
    main: "./src/main.js",
    "shared-websocket-worker": "./src/worker/shared-websocket-worker.js",
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
  target: "webworker",
};
```

## Client-side integration

The client-side wrapper provides a clean API for tabs to use:

```js
// src/client/websocket-client.js
export class WebSocketClient {
  constructor(workerPath = "/shared-websocket-worker.js") {
    this.worker = new SharedWorker(workerPath);
    this.port = this.worker.port;
    this.setupPortHandlers();
    this.connectionState = "disconnected";
    this.messageHandlers = new Set();
  }

  setupPortHandlers() {
    this.port.addEventListener("message", (event) => {
      const { type, data, state, error } = event.data;

      switch (type) {
        case "connection":
          this.connectionState = state;
          this.onConnectionStateChange(state);
          break;
        case "message":
          this.onMessage(data);
          break;
        case "error":
          this.onError(error);
          break;
      }
    });

    this.port.start();
  }

  connect(url) {
    this.port.postMessage({ type: "connect", url });
  }

  send(data) {
    this.port.postMessage({ type: "send", data });
  }

  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  onMessage(data) {
    this.messageHandlers.forEach((handler) => handler(data));
  }

  onConnectionStateChange(state) {
    console.log(`WebSocket connection state: ${state}`);
    // Update UI based on connection state
    this.updateConnectionIndicator(state);
  }

  onError(error) {
    console.error("WebSocket error:", error);
  }

  updateConnectionIndicator(state) {
    const indicator = document.querySelector("#connection-status");
    if (indicator) {
      indicator.textContent = state;
      indicator.className = `status-${state}`;
    }
  }

  disconnect() {
    this.port.postMessage({ type: "disconnect" });
  }
}

// Usage in your app
import { WebSocketClient } from "./client/websocket-client.js";

const wsClient = new WebSocketClient();
wsClient.connect("wss://api.example.com/websocket");

wsClient.addMessageHandler((data) => {
  console.log("Received:", data);
  // Handle incoming messages
});

// Send messages
wsClient.send({ action: "subscribe", channel: "updates" });

// Clean up when page unloads
window.addEventListener("beforeunload", () => {
  wsClient.disconnect();
});
```

## Shared message types

Define common message types for type safety and consistency:

```js
// src/types/messages.js
export const MessageTypes = {
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  SEND: "send",
  MESSAGE: "message",
  CONNECTION: "connection",
  ERROR: "error",
  PING: "ping",
  PONG: "pong",
};

export const ConnectionStates = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  RECONNECTING: "reconnecting",
};
```

## Connection lifecycle management

The shared worker manages the WebSocket lifecycle across all connected tabs:

```js
// src/worker/connection-monitor.js
import { MessageTypes, ConnectionStates } from "../types/messages.js";

export class ConnectionMonitor {
  constructor(wsManager) {
    this.wsManager = wsManager;
    this.heartbeatInterval = null;
    this.lastActivity = Date.now();
    this.heartbeatTimeout = 30000; // 30 seconds
  }

  startMonitoring() {
    this.wsManager.setCallbacks({
      ...this.wsManager.callbacks,
      onOpen: () => this.startHeartbeat(),
      onClose: () => this.stopHeartbeat(),
    });
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.wsManager.websocket?.readyState === WebSocket.OPEN) {
        this.wsManager.sendMessage({ type: MessageTypes.PING });
      }
    }, this.heartbeatTimeout);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }
}
```

## State synchronization across tabs

When new tabs connect to the shared worker, they need to receive the current app
state:

```js
// State management in shared worker
class StatefulWebSocketManager extends EnhancedWebSocketManager {
  constructor() {
    super();
    this.appState = new Map();
  }

  addPort(port) {
    super.addPort(port);

    // Send current app state to new tab
    if (this.appState.size > 0) {
      port.postMessage({
        type: "state-sync",
        state: Object.fromEntries(this.appState),
      });
    }
  }

  handleIncomingMessage(data) {
    // Update shared state based on server messages
    if (data.type === "state-update") {
      this.appState.set(data.key, data.value);
    }

    // Broadcast to all tabs
    this.broadcastToAllPorts({ type: "message", data });
  }

  handlePortMessage(message, port) {
    if (message.type === "state-request") {
      port.postMessage({
        type: "state-sync",
        state: Object.fromEntries(this.appState),
      });
      return;
    }

    super.handlePortMessage(message, port);
  }
}
```

## Browser compatibility and fallbacks

Shared workers have good browser support but may not work in all environments:

```js
// Feature detection and fallback
class WebSocketConnection {
  constructor() {
    if (this.supportsSharedWorkers()) {
      this.client = new SharedWebSocketClient();
    } else {
      this.client = new DirectWebSocketClient();
    }
  }

  supportsSharedWorkers() {
    return typeof SharedWorker !== "undefined";
  }

  connect(url) {
    return this.client.connect(url);
  }

  send(data) {
    return this.client.send(data);
  }

  addMessageHandler(handler) {
    return this.client.addMessageHandler(handler);
  }
}

// Direct WebSocket fallback for unsupported browsers
class DirectWebSocketClient {
  constructor() {
    this.websocket = null;
    this.messageHandlers = new Set();
  }

  connect(url) {
    this.websocket = new WebSocket(url);
    this.setupHandlers();
  }

  setupHandlers() {
    this.websocket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      this.messageHandlers.forEach((handler) => handler(data));
    });
  }

  send(data) {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    }
  }

  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }
}
```

## Performance considerations

Using shared workers for WebSocket management provides many performance
benefits:

- **Reduced server load**: Single connection per origin instead of per-tab
- **Better resource usage**: Shared memory and processing across tabs
- **Improved reliability**: Centralized reconnection logic
- **Consistent state**: Synchronized app state across all tabs

But consider these trade-offs:

- **Complexity**: Extra abstraction layer and message passing overhead
- **Debugging**: More complex debugging across worker and main threads
- **Browser support**: Fallback strategies needed for unsupported browsers

## Monitoring and debugging

Add logging and monitoring to track connection health:

```js
// Monitoring utilities
class WebSocketMonitor {
  constructor(manager) {
    this.manager = manager;
    this.metrics = {
      connectionsCreated: 0,
      messagesReceived: 0,
      messagesSent: 0,
      reconnections: 0,
      activeTabs: 0,
    };
  }

  logConnection() {
    this.metrics.connectionsCreated++;
    console.log("WebSocket connected", this.metrics);
  }

  logMessage(direction, data) {
    if (direction === "received") {
      this.metrics.messagesReceived++;
    } else {
      this.metrics.messagesSent++;
    }

    console.log(`Message ${direction}:`, data, this.metrics);
  }

  logReconnection() {
    this.metrics.reconnections++;
    console.log("WebSocket reconnection attempt", this.metrics);
  }

  updateActiveTabCount(count) {
    this.metrics.activeTabs = count;
  }

  getMetrics() {
    return { ...this.metrics };
  }
}
```

This approach provides an efficient, scalable solution for managing WebSocket
connections across many browser tabs while maintaining performance and
reliability.

[shared-worker]: https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
[websocket]: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
[message-port]: https://developer.mozilla.org/en-US/docs/Web/API/MessagePort
