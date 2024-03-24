<script context="module">
	import Wallet from '../../lib/wallet/Wallet.svelte';

	/**
	 * Stories about a Button.
	 *
	 * This description is set as a commentary on the meta export.
	 */
	export const meta = {
		title: 'Wallet',
		component: Wallet,
		tags: ['autodocs']
	};
</script>

<script>
	import { Template, Story } from '@storybook/addon-svelte-csf';
</script>

<Template let:args>
	<div class="max-w-xl mx-auto">
		<Wallet {...args} />
	</div>
</Template>

<Story name="Local" args={{ id: 'local', mintUrl: 'http://localhost:3338' }} />
<Story name="Test Nut" args={{ id: 'test-nut', mintUrl: 'https://testnut.cashu.space' }} />
<Story name="Brakke Mint" args={{ id: 'Brakke', mintUrl: 'https://mint.brakke.cc' }} />
