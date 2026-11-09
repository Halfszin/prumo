# Code Signing Policy

> Status: applying to the [SignPath Foundation](https://signpath.org) open source program. The line below applies once the project is accepted.

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

## What is signed

Only the Windows installer of Prumo (`Prumo-Setup-<version>.exe`) built from this public repository by the GitHub Actions workflow [`.github/workflows/instalador.yml`](.github/workflows/instalador.yml) is signed. Every signed release is published on the [Releases](https://github.com/Halfszin/prumo/releases) page with its source commit. Nothing built outside this repository's CI is submitted for signing.

## Team roles

- **Authors / Committers:** [Halfszin](https://github.com/Halfszin)
- **Reviewers:** [Halfszin](https://github.com/Halfszin)
- **Approvers:** [Halfszin](https://github.com/Halfszin)

Changes from people outside the team (pull requests) are reviewed before they are merged, including changes to build scripts and the CI workflow. Every signing request is approved manually by an approver. All team members use multi-factor authentication on GitHub and SignPath.

## Privacy policy

Prumo does not collect any data. It has no accounts, analytics, telemetry or advertising, and it does not use cookies. Everything the user creates stays on their computer.

The only network connection Prumo makes on its own is the update check: it downloads the release metadata and, when there is a new version, the installer from GitHub (github.com). The user can turn this off in Settings > Privacy and data; when it is off, Prumo does not connect to any network. Links the user clicks inside notes open in the user's browser.

Full policy (Portuguese): [PRIVACIDADE.md](PRIVACIDADE.md).

## Third-party components

Prumo is MIT licensed. Its third-party components are open source under permissive licenses (MIT, BSD, ISC, Apache-2.0, SIL OFL for the fonts); see [THIRD_PARTY_LICENSES.txt](THIRD_PARTY_LICENSES.txt).
