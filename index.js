// @ts-check
import { applyUpdate as YApplyUpdate } from "yjs"
import { fromUint8Array, toUint8Array } from "js-base64"

/** @typedef {import("yjs").Doc} YDoc */
/** @typedef {Parameters<YApplyUpdate>[2]} TransactionOrigin */
/** @typedef {Parameters<YApplyUpdate>[1]} YUpdate */

// The webxdc spec requires update payloads to be
// > any javascript primitive, array or object
// https://github.com/webxdc/webxdc_docs/blob/18f5e5a7bb62bdd9df47b129179948aac269769b/src/spec.md#sendupdate
// Yjs updates are `Uint8Array`, which are not primitives, so we need to transform them.
// https://docs.yjs.dev/api/document-updates#example-base64-encoding
// TODO perf: the js-base64 library not the lightest one.
/**
 * @param {YUpdate} update
 */
function serializeUpdate(update) {
	return fromUint8Array(update);
}
/**
 * @param {ReturnType<typeof serializeUpdate>} serializedUpdate
 */
function deserializeUpdate(serializedUpdate) {
	return toUint8Array(serializedUpdate);
}

// TODO add a way to sync several documents (i.e. call this more than once, for
// different documents), or document that only one doc per context is supported.
/**
 * @param {YDoc} ydoc
 * @param {TransactionOrigin} transactionOrigin `transactionOrigin` to use when updating the `ydoc`
 * (see {@link YApplyUpdate|`Y.applyUpdate`})
 * @returns {Promise<void>} resolves when all the pending updates have been applied
 */
export function initWebxdcSyncProvider(ydoc, transactionOrigin = '__webxdcUpdateHandler') {
	// TODO refactor: import webxdc types.
	// https://github.com/webxdc/webxdc_docs/blob/18f5e5a7bb62bdd9df47b129179948aac269769b/src/tips_and_tricks.md#get-the-typescript-definitions
	const setListenerP = webxdc.setUpdateListener(
		(update) => {
			// TODO perf: don't update one by one. Batch updates? ydoc.transact?
			// TODO maybe `transactionOrigin` should be the `selfAddr` of the sender??
			// Perhaps with `webxdc` (pre|suf)fix.
			YApplyUpdate(ydoc, deserializeUpdate(update.payload), transactionOrigin)
		},
		// TODO perf: utilize local cache, e.g. `y-indexeddb`. Although make sure that
		// the update is actually stored. See https://github.com/yjs/y-indexeddb/issues/28
		0,
	)

	// TODO perf: add an option to throttle this.
	ydoc.on('update', (/** @type {Uint8Array} */update, origin) => {
		if (origin === transactionOrigin) {
			return
		}
		webxdc.sendUpdate({
				payload: serializeUpdate(update),
				// payload: {
				// 	update: serializableArray,
				// 	sender: webxdc.selfAddr
				// },
			},
			''
		)
	})

	return setListenerP
}
