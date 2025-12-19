import OpenAI from 'openai';
// import fetch from 'node-fetch';
import fs from 'fs';

const openai = new OpenAI({
	apiKey: ''
});

// prompt: `Use the provided product photo as the first frame and main visual anchor.

// The necklace must stay perfectly fixed and unchanged in shape; simulate all motion through camera movement and lighting only.

// Create a 12‑second e-commerce product video for a premium necklace.
// Preserve the exact necklace design, colors, materials, and proportions from the input image.
// Do NOT change, redesign, or replace the necklace in any way — no changes to the pendant shape, chain length or thickness, gemstones, metal color, or engravings.
// Keep the necklace perfectly sharp and consistent in every frame.
// Only the camera movement, background, lighting, and reflections may change.

// Keep the same aspect ratio and framing as the input image so that the necklace size and position stay consistent.

// Scene and style:
// – High-end studio setting with a softly blurred background, warm and cinematic lighting.
// – Start from the same angle as the input image, then slowly push the camera closer and slightly orbit around the necklace to create depth and parallax.
// – Add subtle sparkle highlights and light flares on the gemstones and metal as the light moves, making the necklace look luxurious, refined, and irresistible.
// – No human models, no hands, no text over the product.
// – Clean, minimal, luxury e-commerce style suitable for an online store product page and social media ad.
// `

let videoId = '';

async function main() {
	const imagePath = './watch.jpg';
	const imageBuffer = fs.readFileSync(imagePath);

	// 2. 显式构造一个 File，指定 MIME 为 image/jpeg（如果是 PNG 就写 image/png）
	const imageFile = new File([imageBuffer], 'watch.jpg', {
		type: 'image/jpeg'
	});

	// 1
	let video = await openai.videos.create({
		model: 'sora-2-pro',
		size: '720x1280',
		seconds: '8',
		input_reference: imageFile,
		prompt: `Use the provided product photo as the first frame and main visual anchor.

Create a e‑commerce product video featuring a premium wristwatch worn by a model. 
The watch must stay perfectly fixed and unchanged in design; simulate all motion through camera movement, lighting, and subtle natural movement of the model’s hand and wrist only.

Preserve the exact watch design, colors, materials, and proportions from the input image.
Do NOT change, redesign, or replace the watch in any way — no changes to the dial, case shape, bezel, crown, strap, buckle, logo, indices, or metal and strap colors.
Keep the watch face, logo, and details perfectly sharp and consistent in every frame.
Only the camera movement, background, lighting, reflections, and the model’s gentle hand and wrist motion may change.

Keep the same aspect ratio and framing as the input image so that the watch size and position stay consistent.

Scene and style:
– High-end studio or minimal lifestyle setting with a softly blurred background and warm, cinematic lighting.
– Start from the same angle as the input image, then slowly push the camera closer and gently orbit around the watch to create depth and parallax.
– Show the model’s hand and wrist making small, elegant movements: slightly rotating the wrist, adjusting the cuff, or turning the wrist to catch the light.
– Add subtle sparkle highlights and soft light reflections on the watch crystal, bezel, and metal as the light moves, making the watch look luxurious, precise, and desirable.
– Do not show any exaggerated body poses; keep the focus on the watch and the model’s hand and wrist.
– No on-screen text over the product.
– Clean, minimal, luxury e‑commerce and fashion ad style suitable for an online store product page and social media marketing video.`
	});

	console.log('Video generation started: ', video);
	videoId = video.id;
}

// main();

// id: 'video_692a9595169881908bd1cdf6db8281e40d3aa1093a3d376c',

const API_BASE = 'https://api.openai.com/v1'; // 换成实际域名
const API_KEY = '';
// const videoId = 'video_6929e9161b388193b34ff0e63f5bc9e10b7c7c2adc7a8ded';
videoId = 'video_692a9fc554188190a89b2e33e59a9e2e07964e8a08621988';

// 2
async function getVideo() {
	const res = await fetch(`${API_BASE}/videos/${videoId}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${API_KEY}`, // 或者 "X-API-Key": API_KEY
			Accept: 'application/json'
		}
	});

	if (!res.ok) {
		console.error('Request failed:', res.status, await res.text());
		return;
	}

	const data = await res.json();
	console.log('Video info:', data);
}

// getVideo();

// 3
const content = await openai.videos.downloadContent(videoId);

const body = content.arrayBuffer();
const buffer = Buffer.from(await body);

fs.writeFileSync('video.mp4', buffer);

console.log('Wrote video.mp4');
