// prompt: https://www.imaginebuddy.com/imaginebuddy/collection/35/chatgpt-jewelry-ad-prompts-stunning-designs

// Node 18+ includes native fetch, no need for node-fetch
import fs from 'fs';

// ========== 配置 ==========
const API_KEY = '';
const API_URL = 'https://api.laozhang.ai/v1beta/models/gemini-3-pro-image-preview:generateContent';

const INPUT_IMAGE = 'gril01.png'; // 使用示例1生成的图片
// const PROMPT = `masterpiece, ultra-realistic advertising campaign photo, a stunning female model wearing a luxurious, elegantly styled outfit that does not obstruct the [provided jewelry] (ring, watch, bracelet, or necklace).
// Framing and composition adapt to the jewelry type:

// for rings and bracelets: medium close-up on hands and wrists;
// for watches: medium close-up on wrist and lower arm;
// for necklaces: medium close-up on neck and shoulders.
// Shot from roughly a 30-degree angle, with sharp focus on the jewelry piece.
// The [provided jewelry] must be identical to the reference image, hyper-detailed, perfectly matching the design, shape, size, color, and materials.

// Model with neutral and natural skin texture, refined makeup that can be either cool-toned or warm-toned, automatically chosen to best complement the jewelry and overall mood, with subtle shimmering highlighter. Atmosphere is luxurious, exclusive, high-end.

// Adaptive dramatic studio lighting: either cool or warm key light, automatically selected to flatter the jewelry and the model, with a strong main light and subtle rim light to create depth and dimension. Shot on Phase One XF, 120mm macro lens, 8K, hyper-detailed, professional photography..`;

const PROMPT = `在保留原图人物的脸型、五官、表情、发型、身材比例、肤色、光照效果、镜头角度和背景完全不变的前提下，仅对人物的服装和手势进行适度修改：

将人物原有服装更换为一套日常休闲装，例如简约 T 恤配短裤，或宽松的休闲连衣裙，整体风格自然、干净、舒适，不过分夸张。
调整人物双手的姿势和摆放位置，使动作更加自然、放松，与休闲穿搭协调，比如轻松垂手、搭在腰间或自然放在身体侧面等。
特别要求：镜头远近与原图保证一致，保持原图胸部曲线，自然地露出一些事业线，整体效果要健康、得体，不要改变人物的气质、身材曲线和画面构图。整体画面风格、清晰度和色调与原图保持一致，让成片看上去更自然、更耐看、让人一眼会喜欢的感觉。`;

const ASPECT_RATIO = '1:1';
const IMAGE_SIZE = '4K'; // Nano Banana 2: 1K, 2K, 4K
// ============================

async function main() {
	try {
		// 读取并编码图片
		if (!fs.existsSync(INPUT_IMAGE)) {
			console.error(`❌ 错误: 找不到输入图片 ${INPUT_IMAGE}`);
			return;
		}

		const imageBuffer = fs.readFileSync(INPUT_IMAGE);
		const imageB64 = imageBuffer.toString('base64');

		const headers = {
			Authorization: `Bearer ${API_KEY}`,
			'Content-Type': 'application/json'
		};

		const payload = {
			contents: [
				{
					parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }]
				}
			],
			generationConfig: {
				responseModalities: ['IMAGE'],
				imageConfig: {
					aspectRatio: ASPECT_RATIO,
					imageSize: IMAGE_SIZE
				}
			}
		};

		console.log('🚀 正在发送请求...');
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify(payload)
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
		}

		const result = await response.json();

		// 保存图片
		if (
			result.candidates &&
			result.candidates[0] &&
			result.candidates[0].content &&
			result.candidates[0].content.parts[0].inlineData
		) {
			const outputData = result.candidates[0].content.parts[0].inlineData.data;
			const outputBuffer = Buffer.from(outputData, 'base64');
			fs.writeFileSync('zout/girl_sytle3.png', outputBuffer);
			console.log('✅ 图片已保存: girl_sytle3.png');
		} else {
			console.error('❌ 响应格式不正确:', JSON.stringify(result, null, 2));
		}
	} catch (error) {
		console.error('❌ 发生错误:', error.message);
	}
}

main();
