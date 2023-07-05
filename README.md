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

## Disadvantages

At its current state, this library completely abstracts away the webxdc update API, namely [`webxdc.setUpdateListener()`](https://docs.webxdc.org/spec.html#setupdatelistener) and [`webxdc.sendUpdate()`](https://docs.webxdc.org/spec.html#sendupdate), so you won't be able to use them manually. All you can do is sync the `Y.Doc` state. This is sufficient for early stages of development, or prototyping.
