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
import { applyUpdateV2 as YApplyUpdate, mergeUpdatesV2 as YMergeUpdates } from "yjs"

/** @typedef {import("yjs").Doc} YDoc */
/** @typedef {Parameters<YApplyUpdate>[2]} TransactionOrigin */
/** @typedef {Parameters<YApplyUpdate>[1]} YUpdate */

// TODO add a way to sync several documents (i.e. call this more than once, for
// different documents), or document that only one doc per context is supported.
export class WebxdcSyncProvider {
	/**
	 * @param {YDoc} ydoc
	 * @param {TransactionOrigin} transactionOrigin `transactionOrigin` to use when updating
	 * the `ydoc` (see {@link YApplyUpdate|`Y.applyUpdate`})
	 * @param {(update: YUpdate) => unknown} serializeUpdate
	 * The webxdc spec requires update payloads to be
	 *
	 * > any javascript primitive, array or object
	 *
	 * https://github.com/webxdc/webxdc_docs/blob/18f5e5a7bb62bdd9df47b129179948aac269769b/src/spec.md#sendupdate
	 * Yjs updates are `Uint8Array`, which are not primitives, so we need to transform them.
	 * https://docs.yjs.dev/api/document-updates#example-base64-encoding
	 * @param {(serializedUpdate: unknown) => YUpdate} deserializeUpdate
	*/
	constructor(
		ydoc,
		serializeUpdate,
		deserializeUpdate,
		transactionOrigin = '__webxdcUpdateHandler'
	) {
		// TODO refactor: import webxdc types.
		// https://github.com/webxdc/webxdc_docs/blob/18f5e5a7bb62bdd9df47b129179948aac269769b/src/tips_and_tricks.md#get-the-typescript-definitions

		/**
		 * Resolves when the stored state of the webxdc app has been applied to the {@link ydoc}.
		 * @public
		 * @readonly
		 * @type {Promise<void>}
		 */
		this.initialStateRestored = webxdc.setUpdateListener(
			(update) => {
				// TODO perf: don't update one by one. Batch updates? ydoc.transact?
				// TODO maybe `transactionOrigin` should be the `selfAddr` of the sender??
				// Perhaps with `webxdc` (pre|suf)fix.
				YApplyUpdate(ydoc, deserializeUpdate(update.payload), transactionOrigin)
			},
			// TODO perf: utilize local cache, e.g. `y-indexeddb`. Although make sure that
			// the update is actually stored. See https://github.com/yjs/y-indexeddb/issues/28
			0,
		);;

		/**
		 * @private
		 * @type {YUpdate[]}
		 */
		this._unsentLocalUpdates = [];
		/**
		 * @private
		 */
		this._serializeUpdate = serializeUpdate;
		/**
		 * This function is called whenever the {@link ydoc} is updated by us, that is
		 * whenever we have updates that need to be sent to other peers, with `this` value
		 * being the {@link WebxdcSyncProvider} instance.
		 *
		 * You can override this property.
		 *
		 * The default value is {@link sendUnsentLocalUpdates}, i.e. each update gets sent immediately.
		 *
		 * @public
		 * @type {() => void}
		 * @this {this}
		 */
		this.onNeedToSendLocalUpdates = this.sendUnsentLocalUpdates;

		ydoc.on('updateV2', (/** @type {Uint8Array} */update, origin) => {
			if (origin === transactionOrigin) {
				return
			}
			this._unsentLocalUpdates.push(update);
			this.onNeedToSendLocalUpdates();
		});
	}
	/**
	 * Send the unsent local updates to other peers.
	 * Also see {@link onNeedToSendLocalUpdates}
	 * @public
	 * @returns {void}
	 */
	sendUnsentLocalUpdates() {
		if (this._unsentLocalUpdates.length <= 0) {
			return;
		}
		webxdc.sendUpdate(
			{
				payload: this._serializeUpdate(YMergeUpdates(this._unsentLocalUpdates)),
				// payload: {
				// 	update: serializableArray,
				// 	sender: webxdc.selfAddr
				// },
			},
			''
		);
		this._unsentLocalUpdates = [];
	}
}
