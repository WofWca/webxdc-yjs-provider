// @ts-check
import { applyUpdate as YApplyUpdate } from "yjs"

/** @typedef {import("yjs").Doc} YDoc */
/** @typedef {Parameters<YApplyUpdate>[2]} TransactionOrigin */

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
			YApplyUpdate(ydoc, new Uint8Array(update.payload), transactionOrigin)
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
		// TODO perf: conversion to an ordinary array. Not good.
		// Look up how other Yjs connectors do this. Or
		// https://docs.yjs.dev/api/document-updates#example-base64-encoding
		const serializableArray = [...(update)]
		webxdc.sendUpdate({
				payload: serializableArray,
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
