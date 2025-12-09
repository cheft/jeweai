export const cardRegex = {
	visa: /^4/,
	mastercard: /^5[1-5]/,
	amex: /^3[47]/,
	discover: /^6(?:011|5)/
};

export type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export function getCardType(number: string): CardType {
	const clean = number.replace(/\D/g, '');
	if (cardRegex.visa.test(clean)) return 'visa';
	if (cardRegex.mastercard.test(clean)) return 'mastercard';
	if (cardRegex.amex.test(clean)) return 'amex';
	if (cardRegex.discover.test(clean)) return 'discover';
	return 'unknown';
}

export function formatCardNumber(value: string): string {
	const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
	const matches = v.match(/\d{4,16}/g);
	const match = (matches && matches[0]) || '';
	const parts = [];

	for (let i = 0, len = match.length; i < len; i += 4) {
		parts.push(match.substring(i, i + 4));
	}

	if (parts.length) {
		return parts.join(' ');
	} else {
		return value;
	}
}

export function formatExpiry(value: string): string {
	const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
	if (v.length >= 2) {
		return v.substring(0, 2) + '/' + v.substring(2, 4);
	}
	return v;
}

export function luhnCheck(val: string): boolean {
	let checksum = 0; // running checksum total
	let j = 1; // takes value of 1 or 2

	// Process each digit one by one starting from the last
	for (let i = val.length - 1; i >= 0; i--) {
		let calc = 0;
		// Extract the next digit and multiply by 1 or 2 on alternative digits.
		calc = Number(val.charAt(i)) * j;

		// If the result is in two digits add 1 to the checksum total
		if (calc > 9) {
			checksum = checksum + 1;
			calc = calc - 10;
		}

		// Add the units element to the checksum total
		checksum = checksum + calc;

		// Switch the value of j
		if (j == 1) {
			j = 2;
		} else {
			j = 1;
		}
	}

	//Check if it is divisible by 10 or not.
	return checksum % 10 === 0;
}

export function validateExpiry(month: string, year: string): boolean {
	const today = new Date();
	const currentYear = today.getFullYear() % 100; // 2 digits
	const currentMonth = today.getMonth() + 1;

	const m = parseInt(month, 10);
	const y = parseInt(year, 10);

	if (isNaN(m) || isNaN(y)) return false;
	if (m < 1 || m > 12) return false;

	if (y < currentYear) return false;
	if (y === currentYear && m < currentMonth) return false;

	return true;
}
