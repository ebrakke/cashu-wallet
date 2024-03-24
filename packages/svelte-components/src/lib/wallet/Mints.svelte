<script lang="ts">
	import { getAppState } from './state.js';

	const { wallet } = getAppState();
	$: state = $wallet?.state$;
</script>

<div class="overflow-x-auto h-48 w-full">
	<table class="table">
		<thead>
			<tr>
				<th>Mint</th>
				<th>URL</th>
				<th>Balance</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				<td>{$state.mintUrl}</td>
				<td>{$state.mintUrl}</td>
				<td>{$state.balance} sats</td>
			</tr>
		</tbody>
	</table>
</div>
<button class="btn btn-disabled">Add Mint</button>
