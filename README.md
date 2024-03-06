# Cashu Wallet

A bare bones [cashu](https://cashu.space) wallet implementation that can be used in any javascript application.

**NOTE**: This is super rough an early, and not feature complete. Please don't use in production!

## Background

Cashu wallets all (more or less) have the same basic features when it comes to state. We need to track the tokens which are minted, track invoices, and allow users to send and receive both ecash and lightning.

The UX for these wallets will differ based on use case, but the internals shouldn't change much. Leveraging [cashu-ts](https://github.com/cashubtc/cashu-ts), `cashu-wallet` adds a stateful layer which can be used in any web application.

The building block is the `Wallet` class, which handles mint connections and exposes the following interface

```ts
interface IWallet {
  state$: Observable<WalletState>;
  state: WalletState; // A getter for the current state
  receive(payload: ReceivePayload): Promise<void | string>;
  send(payload: SendPayload): Promise<string | void>;
}
```

This provides the bare bones functionality that one might want to do with a cashu wallet. By utilizing RxJS, we have a framework agnostic way to tap into reactivity. Framework plugins can make it easier to use in a specific scenario, but are not required to just get a wallet running in your application.

## Use cases

- Embed in a nostr client
- A gambling app that may want every user to have an ecash wallet
- A web based RPG in which currencies are backed with ecash mints.

## Features

- Reactivity built in using RxJS
- Framework Agnostic

![sample-app](./docs/sample-app.png)

## TODO

Create adapters for:

- [ ] React (hook)
- [ ] Svelte (store)
- [ ] Vue (pinia store)

- [ ] Better documentation
- [ ] Better sample application
- [ ] Cleanup dependencies
- [ ] Make this a library
- [ ] Publish to npm

## Installation

1. Clone the repository: `git clone https://github.com/ebrakke/cashu-wallet.git`
2. Install dependencies: `pnpm install`
3. Run sample app: `pnpm dev`

## Contributing

Contributions are welcome! Please follow the guidelines in [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This project is licensed under the [MIT License](./LICENSE).
