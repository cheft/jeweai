import { writable } from 'svelte/store';

export type PaymentMethod = {
	id: string;
	brand: string;
	last4: string;
	expMonth: number;
	expYear: number;
	isDefault: boolean;
};

export type User = {
	id: string;
	email: string;
	name: string;
	credits: number;
	plan: 'free' | 'growth' | 'scale';
	billingCycle: 'monthly' | 'yearly';
	paymentMethods: PaymentMethod[];
};

// Initial state: not logged in
const initialState: User | null = null;

function createAuthStore() {
	const { subscribe, set, update } = writable<User | null>(initialState);

	return {
		subscribe,
		login: (userData?: Partial<User>) => {
			set({
				id: userData?.id || 'usr_' + Math.random().toString(36).substr(2, 9),
				email: userData?.email || 'demo@sekotalk.com',
				name: userData?.name || 'Demo User',
				credits: userData?.credits ?? 10,
				plan: userData?.plan || 'free',
				billingCycle: userData?.billingCycle || 'monthly',
				paymentMethods: userData?.paymentMethods || [
					{
						id: 'pm_1',
						brand: 'visa',
						last4: '4242',
						expMonth: 12,
						expYear: 2028,
						isDefault: true
					}
				]
			});
		},
		logout: () => {
			localStorage.removeItem('token');
			set(null);
		},
		addCredits: (amount: number) =>
			update((u) => {
				if (!u) return null;
				return { ...u, credits: u.credits + amount };
			}),
		setPlan: (plan: 'growth' | 'scale', cycle: 'monthly' | 'yearly') =>
			update((u) => {
				if (!u) return null;
				return { ...u, plan, billingCycle: cycle };
			}),
		addPaymentMethod: (pm: Omit<PaymentMethod, 'id' | 'isDefault'>) =>
			update((u) => {
				if (!u) return null;
				const newPm: PaymentMethod = {
					...pm,
					id: 'pm_' + Math.random().toString(36).substr(2, 9),
					isDefault: u.paymentMethods.length === 0 // Default if first
				};
				return { ...u, paymentMethods: [...u.paymentMethods, newPm] };
			}),
		removePaymentMethod: (id: string) =>
			update((u) => {
				if (!u) return null;
				const newMethods = u.paymentMethods.filter((pm) => pm.id !== id);
				// If we removed default, set new default
				if (u.paymentMethods.find((pm) => pm.id === id)?.isDefault && newMethods.length > 0) {
					newMethods[0].isDefault = true;
				}
				return { ...u, paymentMethods: newMethods };
			}),
		setDefaultPaymentMethod: (id: string) =>
			update((u) => {
				if (!u) return null;
				const newMethods = u.paymentMethods.map((pm) => ({
					...pm,
					isDefault: pm.id === id
				}));
				return { ...u, paymentMethods: newMethods };
			})
	};
}

export const auth = createAuthStore();
