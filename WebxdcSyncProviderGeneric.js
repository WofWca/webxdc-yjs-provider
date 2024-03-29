/** @license Apache-2.0 */
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
	 * @param {TransactionOrigin} transactionOrigin `transactionOrigin` to use when applying updates
	 * coming from `webxdc.setUpdateListener` to the {@link ydoc}
	 * (see {@link onIncomingYjsUpdate}, {@link YApplyUpdate|`Y.applyUpdate`})
	 * @param {(update: YUpdate) => unknown} serializeUpdate
	 * [The webxdc spec requires](https://github.com/webxdc/webxdc_docs/blob/18f5e5a7bb62bdd9df47b129179948aac269769b/src/spec.md#sendupdate)
	 * update payloads to be
	 *
	 * > any javascript primitive, array or object
	 *
	 * Yjs updates are `Uint8Array`, which are not primitives, so we need to transform them.
	 * https://docs.yjs.dev/api/document-updates#example-base64-encoding
	 * @param {(serializedUpdate: unknown) => YUpdate} deserializeUpdate
	 * see {@link serializeUpdate}
	 * @param {(
	 * 	outgoingSerializedYjsUpdate: ReturnType<WebxdcSyncProvider['_serializeUpdate']>
	 * ) => void} sendUpdate
	*/
	constructor(
		ydoc,
		serializeUpdate,
		deserializeUpdate,
		sendUpdate,
		transactionOrigin = '__webxdcUpdateHandler'
	) {
		// TODO refactor: import webxdc types.
		// https://github.com/webxdc/webxdc_docs/blob/18f5e5a7bb62bdd9df47b129179948aac269769b/src/tips_and_tricks.md#get-the-typescript-definitions

		/**
		 * This must be called for every update that hasn't been applied to
		 * the {@link ydoc}. This includes updates sent by other peers, and updates
		 * from the previous sessions. Calling it with an update that has already
		 * been applied is OK, and it does nothing.
		 * @public
		 * @readonly
		 * @param {Parameters<typeof deserializeUpdate>[0]} incomingSerializedYjsUpdate
		 * @returns {void}
		 */
		this.onIncomingYjsUpdate = function (incomingSerializedYjsUpdate) {
			// TODO maybe `transactionOrigin` should be the `selfAddr` of the sender??
			// Perhaps with `webxdc` (pre|suf)fix.
			YApplyUpdate(ydoc, deserializeUpdate(incomingSerializedYjsUpdate), transactionOrigin);
		}

		/**
		 * @private
		 * @type {typeof sendUpdate}
		 */
		this.sendUpdate = sendUpdate;

		/**
		 * @private
		 * @type {YUpdate[]}
		 */
		this._unsentLocalUpdates = [];
		/**
		 * @private
		 */
		this._serializeUpdate = serializeUpdate;
		// TODO Consider getting rid of the default value, because it's not obvious
		// to users that webxdc updates are sent on each Yjs udpate.
		/**
		 * This function is automatically called whenever the {@link ydoc} is
		 * updated by us (and not the other peers), that is whenever we have updates
		 * that need to be sent to other peers.
		 *
		 * You can override this property.
		 *
		 * The default value is {@link sendUnsentLocalUpdates}, i.e. each update gets sent immediately.
		 *
		 * @public
		 * @type {() => void}
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
		this.sendUpdate(this.takeOutUnsentLocalUpdates());
	}
	// TODO refactor: if the library user wants to use only this function to send
	// updates and never `sendUnsentLocalUpdates` then requiring
	// `sendUpdate` as a constructor parameter doesn't make sense.
	/**
	 * Useful when you want to send the Yjs updates data manually.
	 * Returns `undefined` if there are no unsent updates.
	 * @see {@link sendUnsentLocalUpdates}
	 * @public
	 * @returns {ReturnType<WebxdcSyncProvider['_serializeUpdate']> | undefined}
	 */
	takeOutUnsentLocalUpdates() {
		if (this._unsentLocalUpdates.length <= 0) {
			return undefined;
		}
		const ret = this._serializeUpdate(YMergeUpdates(this._unsentLocalUpdates));
		// TODO refactor: idk, maybe we need to rename things, because the fact
		// that we "took out" unsent local updates doesn't necessarily mean that
		// we're gonna send them.
		this._unsentLocalUpdates = [];
		return ret;
	}
	/**
	 * @public
	 * @returns {boolean}
	 */
	get haveUnsentUpdates() {
		return this._unsentLocalUpdates.length > 0;
	}
}
