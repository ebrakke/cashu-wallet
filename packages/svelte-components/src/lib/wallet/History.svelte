<script lang="ts">
	import { format } from 'date-fns';
	import { isEcashTransaction, isLightningTransaction } from '@cashu-wallet/core';
	import type { WalletStore } from '@cashu-wallet/svelte';
	export let wallet: WalletStore;
	let state = wallet.state;
	const dateFmt = 'yyyy-MM-dd HH:mm:ss';

	$: pendingInvoices = Object.values($state.transactions)
		.filter(isLightningTransaction)
		.filter((ts) => ts.isPaid === false);

	$: paidInvoices = Object.values($state.transactions)
		.filter(isLightningTransaction)
		.filter((ts) => ts.isPaid === true);

	$: pendingTokens = Object.values($state.transactions)
		.filter(isEcashTransaction)
		.filter((ts) => ts.isPaid === false);
	$: spentTokens = Object.values($state.transactions)
		.filter(isEcashTransaction)
		.filter((ts) => ts.isPaid === true);
</script>

<div>
	<div class="flex flex-col gap-y-2">
		<div>
			<h3>Invoices</h3>
			<table class="table-auto">
				<thead>
					<tr>
						<th>Date</th>
						<th>Amount</th>
						<th>Payment Request</th>
						<th>Paid</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{#each pendingInvoices as invoice}
						<tr>
							<td>{format(invoice.date, dateFmt)}</td>
							<td>{invoice.amount}</td>
							<td>{invoice.pr.slice(0, 20)}...</td>
							<td>{invoice.isPaid}</td>
							<td><button on:click={() => wallet.revokeInvoice(invoice.pr)}>Cancel</button></td>
						</tr>
					{/each}
					{#each paidInvoices as invoice}
						<tr>
							<td>{format(invoice.date, dateFmt)}</td>
							<td>{invoice.amount}</td>
							<td>{invoice.pr.slice(0, 20)}...</td>
							<td>{invoice.isPaid}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div>
			<h3>Tokens</h3>
			<table class="table-auto">
				<thead>
					<tr>
						<th>Date</th>
						<th>Amount</th>
						<th>Token</th>
						<th>Paid</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{#each pendingTokens as token}
						<tr>
							<td>{format(token.date, dateFmt)}</td>
							<td>{token.amount}</td>
							<td>{token.token.slice(0, 20)}...</td>
							<td>{token.isPaid}</td>
							<td><button on:click={() => wallet.receiveEcash(token.token)}>Claim</button></td>
						</tr>
					{/each}
					{#each spentTokens as token}
						<tr>
							<td>{format(token.date, dateFmt)}</td>
							<td>{token.amount}</td>
							<td>{token.token.slice(0, 20)}...</td>
							<td>{token.isPaid}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
