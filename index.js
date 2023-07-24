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
// TODO refactor: rename the file, I guess? It's not `init` anymore.
import {
	WebxdcSyncProvider as WebxdcSyncProviderGeneric
} from "./initWebxdcSyncProviderGeneric"
import { fromUint8Array, toUint8Array } from "js-base64"
// Why not `lodash.throttle`? This one's ligther.
import throttle from "just-throttle"

/** @typedef {import("yjs").applyUpdate} YApplyUpdate */
/** @typedef {Parameters<YApplyUpdate>[1]} YUpdate */

// TODO perf: the js-base64 library not the lightest one.
/**
 * @param {YUpdate} update
 */
export function serializeUpdate(update) {
	return fromUint8Array(update);
}
/**
 * @param {ReturnType<typeof serializeUpdate>} serializedUpdate
 */
export function deserializeUpdate(serializedUpdate) {
	return toUint8Array(serializedUpdate);
}

/**
 * A version of {@link WebxdcSyncProviderGeneric} with reasonable defaults.
 */
export class WebxdcSyncProvider extends WebxdcSyncProviderGeneric {
	/**
	 * @param {ConstructorParameters<typeof WebxdcSyncProviderGeneric>[0]} ydoc
	 * @param {ConstructorParameters<typeof WebxdcSyncProviderGeneric>[3]} [transactionOrigin]
	 */
	constructor(ydoc, transactionOrigin) {
		super(
			ydoc,
			serializeUpdate,
			deserializeUpdate,
			sendUpdate,
			transactionOrigin,
		);

		// TODO refactor: make `onIncomingYjsUpdate` private for the inheriting class?
		/**
		 * Resolves when the stored state of the webxdc app has been applied to the {@link ydoc}.
		 * @public
		 * @readonly
		 * @type {Promise<void>}
		 */
		this.initialStateRestored = webxdc.setUpdateListener(
			(webxdcUpdate) => {
				// Keep in mind that this is also called for the updates that we send.
				// Re-applying an update is fine in Yjs.
				// TODO perf: don't update one by one. Batch updates? ydoc.transact?
				this.onIncomingYjsUpdate(webxdcUpdate.payload)
			},
			// TODO perf: utilize local cache, e.g. `y-indexeddb`. Although make sure that
			// the update is actually stored. See https://github.com/yjs/y-indexeddb/issues/28
			0,
		);

		/**
		 * Delta Chat Core throttles updates pretty heavily:
		 * https://github.com/deltachat/deltachat-core-rust/blob/b96028cd87f02a83f8f0a5282da4b4bb88cdc05c/src/context.rs#L379
		 * https://codeberg.org/webxdc/editor/pulls/23#issuecomment-996164
		 * So we better spend the quota wisely, i.e. not spend all of it immediately
		 * and then get throttled by the messenger implementation.
		 */
		const throttlePeriodMs = 2000;
		/** @type {WebxdcSyncProviderGeneric['onNeedToSendLocalUpdates']} */
		this.onNeedToSendLocalUpdates = throttle(
			this.sendUnsentLocalUpdates,
			throttlePeriodMs,
			// TODO maybe use both leading and trailing.
			// But it doesn't work properly in `just-throttle` IMO:
			// https://github.com/angus-c/just/issues/207#issuecomment-1621879811
			{ leading: false, trailing: true }
		);

		// TODO refactor: turn this into a constructor parameter so it's easier
		// to remember it?
		/**
		 * @public
		 * @see https://docs.webxdc.org/spec.html#sendupdate
		 * @type {string}
		 */
		this.sendUpdateDescr = 'Document updated';

		/**
		 * @param {ReturnType<typeof serializeUpdate>} outgoingSerializedYjsUpdate
		 * @returns {void}
		 */
		function sendUpdate(outgoingSerializedYjsUpdate) {
			webxdc.sendUpdate(
				{
					payload: outgoingSerializedYjsUpdate,
				},
				this.sendUpdateDescr
			)
		}

		// TODO fix: need to ensure that the updates get send when the page gets closed.
		// See https://developer.chrome.com/blog/page-lifecycle-api/#the-beforeunload-event
		// https://stackoverflow.com/questions/7317273/warn-user-before-leaving-web-page-with-unsaved-changes
		// Also maybe need to add info about this to the docs of `WebxdcSyncProviderGeneric`.
		// Or should it just implement it by default itself?
	}
}
