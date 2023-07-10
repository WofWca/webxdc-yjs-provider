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
