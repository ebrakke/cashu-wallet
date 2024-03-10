import { createWalletStore } from "@cashu-wallet/svelte";
import type { Meta, StoryObj } from "@storybook/svelte";

import Wallet from "../../lib/wallet/Wallet.svelte";

const meta = {
  title: "Wallet/Wallet",
  component: Wallet,
  tags: ["autodocs"],
  argTypes: {
    wallet: {
      name: "wallet store",
      description: "The wallet store to use for the wallet component",
    },
  },
} satisfies Meta<Wallet>;

export default meta;
type Story = StoryObj<typeof meta>;

const wallet = createWalletStore("local", "http://localhost:3338");

export const Default: Story = {
  args: {
    wallet,
  },
};
