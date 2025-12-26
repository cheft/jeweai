import OpenAI from 'openai';
// import fetch from 'node-fetch';
import fs from 'fs';

const openai = new OpenAI({
	apiKey: '',
	baseURL: 'https://api.laozhang.ai/v1'
});

let videoId = '';

// prompt: `超高清高端珠宝商业广告视频，15秒，4K分辨率，HDR超清真人，柔和暖调布光，浅米色纯色极简背景。

// 主体设定：
// - 女性模特：白人/浅棕发，妆容为“自然裸感底妆+精致眼妆+暖调哑光唇妆”，发型为低盘发（露出完整脖颈），服装为简约修身吊带（颜色可选：黑色/白色/浅咖色，避免遮挡珠宝）。

// 珠宝产品:
// - 珠宝必须与参考图片完全一致, 严格锁定产品，禁止任何修改。

// 视频情节：
// 1. 0-5秒：模特静止，镜头从面部缓慢下移至珠宝，清晰展示珠宝的形状、光泽与佩戴位置；
// 2. 5-10秒：模特缓慢转动脖颈（左右各转动15度），让珠宝在光线下呈现不同反光角度，同时用温和的语气旁白：“这款粗链锁骨链，以复古大号链环为设计核心，亮面金质适配各种穿搭场景，分量感适中，日常通勤或约会都能成为造型亮点”；
// 3. 10-15秒：镜头推进至珠宝链环的细节特写（停留3秒，清晰展示链环的边缘质感），随后拉回至模特上半身近景，模特轻触珠宝链环后看向镜头微笑。

// 注：不能将参考图做为视频的封面，严格保持珠宝形状、尺寸，不得更改产品的任何细节。`

async function main() {
	const imagePath = './img/ad84314e-612c-4274-8b59-1e62448d55a1.png';
	const imageBuffer = fs.readFileSync(imagePath);

	// 2. 显式构造一个 File，指定 MIME 为 image/jpeg（如果是 PNG 就写 image/png）
	const imageFile = new File([imageBuffer], './img/ad84314e-612c-4274-8b59-1e62448d55a1.png', {
		type: 'image/png'
	});

	// 1
	let video = await openai.videos.create({
		// 	prompt: `
		//   Ultra high-end jewelry commercial video, 15 seconds, 4K resolution, HDR, ultra‑realistic live‑action. Soft warm studio lighting, minimal shadows. Clean, solid light beige background with a minimalist, luxury aesthetic.

		// Subject: A stunning Caucasian female model with light brown hair, styled in a low bun that fully reveals the neck. Makeup: natural “no‑makeup” skin base, refined eye makeup, and warm matte lips. Wardrobe: simple, fitted camisole in either black, white, or light coffee color, with a clean neckline that does not block the jewelry.

		// Jewelry product (critical): The necklace must be identical to the provided reference image, matching the design, shape, proportions, size, and metal finish exactly. Do not modify or reinterpret any detail of the jewelry. Do not change the chain link style, pendant shape (if any), thickness, or clasp design. The reference image is for product locking only and must not be used as a frame, texture, or thumbnail in the video.

		// Storyboard and camera actions:

		// 0–3 seconds:
		// Static pose. Medium close‑up of the model from chest up. The camera starts framed on the model’s face, then slowly tilts/pans down to her neck and collarbone to reveal the necklace. The necklace is clearly visible, showing the overall shape, shine, and how it sits on the body.

		// 3–9 seconds:
		// The camera holds a medium close‑up on the neck and shoulders. The model slowly turns her neck about 15 degrees to the left, then 15 degrees to the right, very smooth and elegant. The movement allows the necklace to catch the warm light and show different reflections and highlights on the metal links. At the same time, add soft voiceover in a calm, warm tone:
		// “This necklace features oversized vintage-inspired chain links in polished gold, perfectly suited to a variety of outfits. It has a comfortable weight and presence, making it a standout detail for everyday work or a night out.”

		// 9–15 seconds:
		// The camera smoothly pushes in to an extreme close‑up of the chain links, holding for about 3 seconds to showcase the edge finishing, surface polish, and metal texture with maximum sharpness and clarity. Then the camera gently pulls back to a medium close‑up of the model’s upper body. The model lightly touches the necklace with her fingers in a natural, elegant gesture, then looks into the camera and smiles softly. The necklace remains perfectly in focus, with all design details clearly visible.

		// Overall mood and style: Warm, sophisticated, luxurious, intimate, and aspirational. No busy backgrounds, no props, no text on screen. The entire focus is on the model and the accurately reproduced necklace.
		// prompt: `15-second ultra high-end jewelry commercial video, 4K HDR, ultra‑realistic live action.
		// Use the provided jewelry product image as the strict design reference: the jewelry must match the photo exactly in shape, size, color, materials, and all fine details, with no changes or reinterpretation. Do not use the provided jewelry product image as the thumbnail, first frame, or cover of the generated video.
		// A beautiful young female model wears this jewelry, shown in elegant slow-motion poses. She gently touches and showcases the piece, turns slightly to catch the light, and looks into the camera with a soft, confident smile. Add a short, warm, marketing-style voiceover where she freely describes and praises the jewelry’s design, shine, and how it elevates any outfit.
		// Lighting: soft, flattering studio light with bright, crisp highlights on the metal/gem, creating strong sparkle and reflections. Background: clean, minimal, luxury look with shallow depth of field so the model and jewelry stand out. Overall mood: stunning, eye‑catching, glamorous, perfect for premium brand advertising.`,
		model: 'sora_video2-15s',
		prompt: `你是一位专业的电视广告大师，请使用图片中的九个分镜图，制作一个15秒的真人实拍电视广告视频，主人公是一个黑发亚洲女性，展现一个极具创意的故事，请添加中文配音，最后一个格子是产品原图，请保持产品的一致性，整个画面全部都是实拍风格`,
		size: '720x1280',
		// seconds: '15',
		input_reference: imageFile
	});

	console.log('Video generation started: ', video);
	videoId = video.id;
}

main();

// id: 'video_692a9595169881908bd1cdf6db8281e40d3aa1093a3d376c',

const API_BASE = 'https://api.laozhang.ai/v1'; // 换成实际域名
const API_KEY = '';
// const videoId = 'video_6929e9161b388193b34ff0e63f5bc9e10b7c7c2adc7a8ded';
videoId = 'video_ebd44b3d-46d8-4e34-a893-4b7c8507438d';

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
// const content = await openai.videos.downloadContent(videoId);

// const body = content.arrayBuffer();
// const buffer = Buffer.from(await body);

// fs.writeFileSync('zout/video6.mp4', buffer);

// console.log('Wrote video.mp4');
