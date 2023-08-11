# webxdc-yjs-provider

An easy way to get started with making a [webxdc](https://webxdc.org) app.
If your app is state-based rather than event-based (which is most likely the case), this may be a good fit for you.

## Usage

```javascript
import * as Y from "yjs";
import { WebxdcSyncProvider } from "webxdc-yjs-provider";

async function init() {
  const ydoc = new Y.Doc();
  const provider = new WebxdcSyncProvider(ydoc);
  await provider.initialStateRestored;
  // From now on the state of the `ydoc` is automatically synced between
  // all the chat members (peers).

  const todoItems = ydoc.getArray("todoItems");
  todoItems.observe(e => {
    // When another peer (or you) modifies the document,
    // this will get executed.
    console.log(`to-do items:\n${todoItems.toArray().join("\n")}`);
  });

  todoItems.push(["wash dishes"]);
}
init();
```

On how to use the `Y.Doc` object, consult [Yjs docs](https://github.com/yjs/yjs/#api).

### How to use `webxdc.sendUpdate()` and `webxdc.setUpdateListener()`

In the above example it's impossible to use the [`webxdc.sendUpdate()`](https://docs.webxdc.org/spec.html#sendupdate) and [`webxdc.setUpdateListener()`](https://docs.webxdc.org/spec.html#setupdatelistener) manually (there are gonna be errors if you try).
If you need those functions, use the following example:

<details><summary>Code</summary>

```javascript
import * as Y from "yjs";
import { serializeUpdate, deserializeUpdate } from "webxdc-yjs-provider";
// Note the different file.
import { WebxdcSyncProvider } from "webxdc-yjs-provider/WebxdcSyncProviderGeneric";

const ydoc = new Y.Doc();
const provider = new WebxdcSyncProvider(
  ydoc,
  serializeUpdate,
  deserializeUpdate,
  (outgoingSerializedYjsUpdate) => {
    webxdc.sendUpdate({
      payload: {
        serializedYjsUpdate: outgoingSerializedYjsUpdate,
        myPayload: undefined,
      },
    }, "Document changed");
  },
);
const initialStateRestored = webxdc.setUpdateListener(update => {
  if (update.payload?.serializedYjsUpdate) {
    provider.onIncomingYjsUpdate(update.payload.serializedYjsUpdate);
  }
  if (update.payload?.myPayload) {
    // handleMyPayload(update.payload.myPayload);
  }
});
// Reassign this in order to not send each update immediately
// provider.onNeedToSendLocalUpdates = () => {};
// sendButton.addEventListener("click", () => {
//   provider.sendUnsentLocalUpdates();
// });

// ...
webxdc.sendUpdate({
  payload: {
    serializedYjsUpdate: undefined,
    myPayload: "some data",
  },
  info: "some info",
  summary: "some summary",
  document: "some document name",
}, "My update");
```

</details>

## Also run your app as a regular website

As we know, webxdc apps are very much just regular web apps that may also utilize the [webxdc API](https://docs.webxdc.org/spec.html#webxdc-api), so it's very easy to make a web version of your webxdc app (or vice versa, if the app is P2P-ready).

<!-- For reference, here's the first ever (I think) interoperable (web and webxdc) app:
https://support.delta.chat/t/porting-vikunja-todo-list-manager-to-webxdc/2471/6?u=wofwca
It does the same thing as below. -->

```diff javascript
 import * as Y from "yjs";
 import { WebxdcSyncProvider } from "webxdc-yjs-provider";
+import { WebrtcProvider } from "y-webrtc";
 
 async function init() {
   const ydoc = new Y.Doc();
+  if (globalThis.webxdc) {
     const provider = new WebxdcSyncProvider(ydoc);
     await provider.initialStateRestored;
+  } else {
+    // TODO don't forget to change the password and the room name,
+    // and other params (see https://github.com/yjs/y-webrtc/#readme).
+    const provider = new WebrtcProvider("testing-webxdc-yjs-provider", ydoc);
+  }
   // From now on the state of the `ydoc` is automatically synced between
   // all the chat members (peers).
```

Now, if you deploy the app as a static (yep!) website, every visitor's `ydoc` state will be synced! (unless [the default signaling servers are down again](https://github.com/yjs/y-webrtc/issues/43), in which case [use a different one](https://github.com/yjs/y-webrtc#signaling), perhaps a self-hosted one).

If necessary, [add persistence](https://github.com/yjs/yjs#example-using-and-combining-providers) in order to not lose the state when all peers close the website. `WebxdcSyncProvider` already includes persistence, so you only need to add it in combination with the `WebrtcProvider`.

For tree-shaking replace `globalThis.webxdc` with a [build-time variable](https://webpack.js.org/plugins/define-plugin/) in the above code snippet.
