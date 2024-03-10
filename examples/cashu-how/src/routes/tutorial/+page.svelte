<script lang="ts">
	import { wallet } from '$lib';
	const handleRequestFunding = async () => {
		const res = await fetch('/api/request-tokens?amount=10');
		const { token, message } = await res.json();
		if (!res.ok) {
			alert(message);
			return;
		}
		await wallet.receiveEcash(token);
	};
</script>

<div class="prose">
	<p>Welcome to the tutorial!</p>
	<p>In this tutorial, we will learn more about ecash, cashu, and how to use an ecash wallet.</p>
	<section>
		<h3>What is a mint?</h3>
		<p>
			A mint is a piece of software that is responsible for issuing ecash. You can think of them
			like a bank. When you want ecash, you ask the mint to issue you some ecash. The mint responds
			with an invoice to pay (a deposit) and upon successful payment of this invoice, it will issue
			the corresponding ecash of the same amount
		</p>
		<b>You are trusting the mint with all of your deposits.</b>
		<p>
			Ecash is a trust based system. Much like you trust a bank with your money, you are trusting a
			mint with your deposits
		</p>
	</section>
	<section>
		<h3>What is an ecash wallet?</h3>
		<p>An ecash wallet stores all of your ecash that you have received from a mint.</p>
		<p>
			To get started with your wallet, you will need to deposit some money with the mint. You can
			use any lightning wallet to pay an invoice and fund your wallet. Some examples include:
		</p>
		<ul>
			<li><a href="#">Strike</a></li>
			<li><a href="#">Wallet of Satoshi</a></li>
			<li><a href="#">Cash App</a></li>
		</ul>
		<p>
			If you don't have a lightning wallet, not to worry, <button
				class="underline"
				on:click={handleRequestFunding}>Click here</button
			> and I will send you 10 sats to your wallet (if I have the funds).
		</p>
	</section>
	<section>
		<h3>Funding the wallet</h3>
		<ol>
			<li>Click on your wallet and hit "Receive"</li>
			<li>Type in 10 sats for the amount</li>
			<li>Scan the resulting lightning invoice from your lightning wallet (or paste it in)</li>
		</ol>
		<p>You should now have a 10 sat balance in your cashu wallet</p>
	</section>
	<section>
		<h3>Sending Ecash</h3>
		<p>
			Now that you've minted some ecash tokens, it's time to spend them! You can send these tokens
			to whomever will accept them. If you have a mobile wallet like eNuts or minibits, you can try
			out the send flow with those app
		</p>
		<ol>
			<li>Click on your wallet and hit "Send"</li>
			<li>Type in 5 sats for the amount</li>
			<li>Open Minibits or eNuts</li>
			<li>Scan the QR code on the screen</li>
		</ol>
		<p>You should now have these 5 sats in your mobile wallet</p>
	</section>
</div>
