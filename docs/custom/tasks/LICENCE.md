# Tasks UI — Enterprise licence notes

## Scope

This document records the **licence posture** for integrating native Docmost
Bases UI (`apps/client/src/ee/base/**`) into the Tasks client.

It is **not** a legal opinion. Human/legal confirmation is required before
publishing EE patches publicly.

## Sources in this repository

- [`apps/client/src/ee/LICENSE`](../../../apps/client/src/ee/LICENSE)
- [`packages/ee/LICENSE`](../../../packages/ee/LICENSE)
- Root [`LICENSE`](../../../LICENSE) is **AGPL-3.0** and does **not** cover `ee/**`

## Enterprise License (summary of file text)

With a valid Docmost Enterprise Edition subscription and compliance with the
Enterprise Terms:

- Production **use** of EE Software is allowed.
- You may **modify** the Software and **publish patches**.
- Docmost retains IP in modifications/patches.
- Modifications/patches may only be exploited with a valid EE subscription.
- Development/testing copy+modify without subscription is allowed; IP still retained.
- Beyond granted rights it is **forbidden to copy, merge, publish, distribute,
  sublicense, and/or sell** the Software.

## Decision matrix (this fork)

| Action | Technical | Contractual (from LICENSE text) | Maintenance |
|--------|-----------|----------------------------------|-------------|
| Import `ee/base` components into Tasks under licensed Hub EE install | Yes | Allowed for production use with valid seats | Prefer thin imports |
| Adapter around EE presentation leaves | Yes | Allowed as modification of use | Low–medium |
| Modify EE files in private fork / private ops | Yes | Allowed (“modify… publish patches”) with seats | Document every touch |
| Factor shared presentational UI from EE | Yes | Same as modify | **High** upstream conflict |
| Share EE CSS modules via import | Yes | Same as use | Prefer over copy |
| Runtime reuse without redistributing EE source | Yes | Intended production model | Best |
| Push EE source or EE factorisation patches to a **public** repo | n/a | **Restricted** — confirm with legal | Avoid |

## Redcore posture (ops)

- Production runs Docmost Hub **EE** with an active enterprise licence path.
- Tasks native UI **imports** EE leaves/styles; it must **not** call `BaseService` / `base_*`.
- Prefer keeping EE factorisation patches **private** until legal confirms public publish.
- OSS Tasks backend (`task_*`, TaskModule) remains separable for rollback.

## LICENCE REQUIRES HUMAN/LEGAL CONFIRMATION

1. Public GitHub publication of any EE factorisation patches.
2. Interpretation of “publish patches” vs private ops/`redcore-docmost` repos.
3. Whether Redcore’s commercial agreement adds limits beyond the LICENSE file.

## Rule for contributors

If unsure whether a change redistributes EE source: **do not publish**; ask legal.
