<script lang="ts">
	import { format } from 'date-fns';
	import { isEcashTransaction, isLightningTransaction } from '@cashu-wallet/core';
	import { getAppState } from './state.js';

	const { wallet, mode } = getAppState();
	$: state = $wallet?.state$;
	const dateFmt = 'yyyy-MM-dd HH:mm:ss';
	$: transactions = Object.values($state.transactions).sort(
		(a, b) => b.date.getTime() - a.date.getTime()
	);
	$: lightning = transactions.filter(isLightningTransaction);

	$: ecash = transactions.filter(isEcashTransaction);

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
	};
</script>

<div class="overflow-x-auto h-96 w-full">
	<button on:click={() => $wallet.checkPendingTransactions()}>Refresh</button>
	<table class="table table-xs table-pin-rows table-pin-cols">
		<thead>
			<tr>
				<th>Date</th>
				<th>Amount</th>
				<th>Token</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			{#if $mode === 'lightning'}
				{#each lightning as tx}
					<tr>
						<td>{format(tx.date, dateFmt)}</td>
						<td>{tx.amount}</td>
						<td
							><button class="btn btn-xs btn-ghost" on:click={() => handleCopy(tx.pr)}
								>{tx.pr.slice(0, 5)}...{tx.pr.slice(-10, -1)}</button
							></td
						>
						<td>
							{#if tx.isPaid}
								<span class="badge badge-success">Paid</span>
							{:else}
								<span class="badge badge-warning">Pending</span>
							{/if}
						</td>
					</tr>
				{/each}
			{/if}
			{#if $mode === 'ecash'}
				{#each ecash as tx}
					<tr>
						<td>{format(tx.date, dateFmt)}</td>
						<td>{tx.amount}</td>
						<td
							><button class="btn btn-xs btn-ghost" on:click={() => handleCopy(tx.token)}
								>{tx.token.slice(0, 5)}...{tx.token.slice(-10, -1)}</button
							></td
						>
						<td>
							{#if tx.isPaid}
								<span class="badge badge-success">Paid</span>
							{:else}
								<span class="badge badge-warning">Pending</span>
							{/if}
						</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
