<script lang="ts">
	let token: string | undefined;
	const onFund = async () => {
		if (!token) return;
		const res = await fetch(`/api/fund/`, { method: 'POST', body: token });
		if (res.ok) {
			token = '';
		}
	};
</script>

<div>
	<form on:submit|preventDefault={onFund}>
		<div class="flex flex-col gap-y-1">
			<label for="token">E-cash Token</label>
			<input class="p-2 border" name="token" type="text" bind:value={token} />
			<div>
				<button class="p-1 outline rounded-md">Fund</button>
			</div>
		</div>
	</form>
</div>
