import { json } from '@sveltejs/kit';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

// Initialize Stripe with secret key from .env
// If env is missing, this will fail at runtime, so we wrap or assume configuration.
const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
	apiVersion: '2025-01-27.acacia' // Use latest or supported API version
});

export async function POST({ request }: { request: Request }) {
	try {
		const { amount, currency = 'usd', plan } = await request.json();

		// Create a PaymentIntent with the order amount and currency
		// Note: For subscriptions, you'd typically use stripe.subscriptions.create
		// But for simplicity/demo of "Payment Element", we often use PaymentIntent for one-time or first invoice.

		// If it's a subscription, we should perform subscription logic.
		// For this demo, we'll implement a simple PaymentIntent flow which is easier to visualize
		// without setting up Stripe Products/Prices in the dashboard.

		const paymentIntent = await stripe.paymentIntents.create({
			amount: amount, // Amount in cents
			currency: currency,
			// In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
			automatic_payment_methods: {
				enabled: true
			},
			metadata: {
				plan: plan
			}
		});

		return json({
			clientSecret: paymentIntent.client_secret
		});
	} catch (error: any) {
		console.error('Stripe API Error:', error);
		return json({ error: error.message }, { status: 400 });
	}
}
