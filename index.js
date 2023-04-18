// @ts-check
import {
	initWebxdcSyncProvider as initWebxdcSyncProviderGeneric
} from "./initWebxdcSyncProviderGeneric"
import { fromUint8Array, toUint8Array } from "js-base64"

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
 * A partial version of {@link initWebxdcSyncProviderGeneric}
 * @param {Parameters<typeof initWebxdcSyncProviderGeneric>[0]} ydoc
 * @param {Parameters<typeof initWebxdcSyncProviderGeneric>[3]} [transactionOrigin]
 */
export function initWebxdcSyncProvider(ydoc, transactionOrigin) {
	return initWebxdcSyncProviderGeneric(
		ydoc,
		serializeUpdate,
		deserializeUpdate,
		transactionOrigin,
	);
}
