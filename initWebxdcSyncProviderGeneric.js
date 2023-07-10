/**
 * @license
 * Copyright 2023 WofWca <wofwca@protonmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. 
 */

// @ts-check
import { applyUpdate as YApplyUpdate } from "yjs"

/** @typedef {import("yjs").Doc} YDoc */
/** @typedef {Parameters<YApplyUpdate>[2]} TransactionOrigin */
/** @typedef {Parameters<YApplyUpdate>[1]} YUpdate */

// TODO add a way to sync several documents (i.e. call this more than once, for
// different documents), or document that only one doc per context is supported.
/**
 * @param {YDoc} ydoc
 * @param {TransactionOrigin} transactionOrigin `transactionOrigin` to use when updating the `ydoc`
 * (see {@link YApplyUpdate|`Y.applyUpdate`})
 * @param {(update: YUpdate) => unknown} serializeUpdate
 * The webxdc spec requires update payloads to be
 *
 * > any javascript primitive, array or object
 *
 * https://github.com/webxdc/webxdc_docs/blob/18f5e5a7bb62bdd9df47b129179948aac269769b/src/spec.md#sendupdate
 * Yjs updates are `Uint8Array`, which are not primitives, so we need to transform them.
 * https://docs.yjs.dev/api/document-updates#example-base64-encoding
 * @param {(serializedUpdate: unknown) => YUpdate} deserializeUpdate
 * @returns {Promise<void>} resolves when all the pending updates have been applied
 */
export function initWebxdcSyncProvider(
	ydoc,
	serializeUpdate,
	deserializeUpdate,
	transactionOrigin = '__webxdcUpdateHandler'
) {
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
