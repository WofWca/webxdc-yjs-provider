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
import { WebxdcSyncProvider } from "webxdc-yjs-provider/initWebxdcSyncProviderGeneric";

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
