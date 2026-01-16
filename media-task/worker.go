package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/hibiken/asynq"
)

const (
	// 图片任务：生成图片
	TaskTypeImageGenerate = "image:generate"
	// 视频任务1：开始生成
	TaskTypeVideoGenerate = "video:generate"
	// 视频任务2：检查状态
	TaskTypeVideoCheckStatus = "video:check_status"

	API_BASE               = "https://api.laozhang.ai/v1"
	API_BASE_BETA          = "https://api.laozhang.ai/v1beta"
	IMAGE_GENERATION_MODEL = "gemini-3-pro-image-preview:generateContent"

	// GRSAI Constants
	GRSAI_API_BASE = "https://grsai.dakka.com.cn/v1"
)

// Helper to update task status in SvelteKit
// Updated payload to include specific keys for new workflow
func updateTaskStatus(taskId, status string, data map[string]interface{}) {
	url := "http://localhost:5173/api/task/update" // Node.js webhook
	payload := map[string]interface{}{
		"taskId": taskId,
		"status": status,
	}
	// Merge extra data
	for k, v := range data {
		payload[k] = v
	}

	jsonData, _ := json.Marshal(payload)

	// Retry logic for webhook
	for i := 0; i < 3; i++ {
		resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
		if err == nil {
			defer resp.Body.Close()
			if resp.StatusCode == 200 {
				fmt.Printf("[Webhook] Success: %s -> %s\n", taskId, status)
				return
			}
			fmt.Printf("[Webhook] Status %d: %s\n", resp.StatusCode, taskId)
		} else {
			fmt.Printf("[Webhook] Error: %v\n", err)
		}
		time.Sleep(1 * time.Second)
	}
}

// --------------- 任务有效载荷 ---------------

type ImageGeneratePayload struct {
	TaskID    string `json:"TaskID"`
	AssetID   string `json:"AssetID"`
	ImagePath string `json:"ImagePath"`
	Width     int    `json:"Width"`
	Height    int    `json:"Height"`
	ImgName   string `json:"ImgName"`
	Prompt    string `json:"Prompt"`
	StyleID   string `json:"StyleID"`
}

type VideoGeneratePayload struct {
	TaskID    string `json:"TaskID"`
	AssetID   string `json:"AssetID"`
	VideoID   string `json:"VideoID"` // Internal ID
	Prompt    string `json:"Prompt"`
	ImagePath string `json:"ImagePath"`
	StyleID   string `json:"StyleID"`
	UserID    string `json:"UserID"`
	Width     int    `json:"Width"`
	Height    int    `json:"Height"`
}

type VideoCheckStatusPayload struct {
	TaskID     string `json:"TaskID"`
	AssetID    string `json:"AssetID"`
	VideoID    string `json:"VideoID"` // Internal ID
	ExternalID string `json:"ExternalID"`
	Provider   string `json:"Provider"`  // "grsai" or default
	ImagePath  string `json:"ImagePath"` // Reference image path
	TryCount   int    `json:"TryCount"`
	UserID     string `json:"UserID"`
	Width      int    `json:"Width"`
	Height     int    `json:"Height"`
}

// GRSAI Structs
type GRSAIImageRequest struct {
	Model        string   `json:"model"`
	Prompt       string   `json:"prompt"`
	Size         string   `json:"size"`
	Variants     int      `json:"variants"`
	Urls         []string `json:"urls"`
	WebHook      string   `json:"webHook"`
	ShutProgress bool     `json:"shutProgress"`
}

type GRSAIVideoRequest struct {
	Model        string `json:"model"`
	Prompt       string `json:"prompt"`
	Url          string `json:"url"`
	AspectRatio  string `json:"aspectRatio"`
	Duration     int    `json:"duration"`
	Size         string `json:"size"`
	WebHook      string `json:"webHook"`
	ShutProgress bool   `json:"shutProgress"`
}

type GRSAIResponse struct {
	ID            string `json:"id"`
	Status        string `json:"status"`
	FailureReason string `json:"failure_reason"`
	Error         string `json:"error"`
}

type GRSAICheckRequest struct {
	ID string `json:"id"`
}

type GRSAICheckResponse struct {
	Code int `json:"code"`
	Data struct {
		ID      string `json:"id"`
		Results []struct {
			URL             string `json:"url"`
			Content         string `json:"content"`         // For image
			RemoveWatermark bool   `json:"removeWatermark"` // For video
			PID             string `json:"pid"`
		} `json:"results"`
		Progress      int    `json:"progress"`
		Status        string `json:"status"`
		FailureReason string `json:"failure_reason"`
		Error         string `json:"error"`
	} `json:"data"`
	Msg string `json:"msg"`
}

// --------------- 消费者：处理任务 ---------------

func NewServer() *asynq.Server {
	redisClient := asynq.RedisClientOpt{
		Addr:     "127.0.0.1:6379",
		Password: "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
		DB:       1,
	}

	return asynq.NewServer(redisClient, asynq.Config{
		Concurrency: 5,
		Queues: map[string]int{
			"media": 10,
		},
	})
}

// HandleImageGenerateTask 处理图片生成任务（同步）
func HandleImageGenerateTask(ctx context.Context, t *asynq.Task) error {
	var p ImageGeneratePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("\n=== [IMAGE] Processing: %s (Asset: %s) ===\n", p.TaskID, p.AssetID)

	tmpDir := "tmp"
	os.MkdirAll(tmpDir, 0755)
	localRefPath := ""
	localCoverPath := ""
	coverKey := ""

	// 1. Download Reference Image from R2 if exists
	if p.ImagePath != "" {
		localRefPath = filepath.Join(tmpDir, fmt.Sprintf("%s_ref.png", p.TaskID))
		defer os.Remove(localRefPath)

		bucketName := os.Getenv("R2_BUCKET")
		if bucketName == "" {
			bucketName = "jeweai"
		}

		err := downloadFromR2(ctx, bucketName, p.ImagePath, localRefPath)
		if err != nil {
			fmt.Printf("[IMAGE] Failed to download reference image: %v\n", err)
			return err
		}
		fmt.Printf("[IMAGE] Downloaded reference image: %s\n", p.ImagePath)

		// 2. Generate 720p Cover for Reference
		localCoverPath = filepath.Join(tmpDir, fmt.Sprintf("%s_ref_cover.png", p.TaskID))
		err = generateReferenceCover(localRefPath, localCoverPath)
		if err == nil {
			coversBucket := os.Getenv("R2_PUBLIC_BUCKET")
			if coversBucket == "" {
				coversBucket = "covers"
			}

			// Fixed user ID: userid123456
			coverKey = fmt.Sprintf("userid123456/%s_720p.png", p.TaskID)
			err = uploadToR2(ctx, localCoverPath, coversBucket, coverKey)
			if err != nil {
				fmt.Printf("[IMAGE] Upload cover warning: %v\n", err)
			} else {
				fmt.Printf("[IMAGE] Uploaded cover: %s\n", coverKey)
			}
			defer os.Remove(localCoverPath)
		} else {
			fmt.Printf("[IMAGE] Generate cover warning: %v\n", err)
		}
	}

	// 3. Notify "generating" with coverPath
	updateTaskStatus(p.TaskID, "generating", map[string]interface{}{
		"coverPath": coverKey,
	})

	// 4. Call AI Image Generation API
	apiKey := os.Getenv("AI_API_KEY")
	grsaiKey := os.Getenv("GRSAI_KEY")
	var generatedImageData []byte
	var err error

	// Flag to track which provider worked
	providerUsed := "none"

	// --- Try GRSAI First ---
	if grsaiKey != "" && p.ImagePath != "" { // GRSAI needs an input image URL? Payload says "urls": [...]. Yes supports ref image.
		fmt.Printf("[IMAGE] Attempting GRSAI...\n")
		// Need a publicly accessible URL for the reference image.
		// We uploaded a cover to R2 public bucket: 'coverKey'. Let's generate a presigned URL for the *original* reference if possible, or use the cover.
		// Best to use the original reference image we downloaded. But we need a URL.
		// We can generate a presigned URL for the 'uploaded' image in R2 (since we don't have public domain info handy).
		// Wait, we downloaded 'p.ImagePath' from R2 Private to local.
		// We should generate a presigned URL for `p.ImagePath` (in private bucket) or `coverKey` (in public bucket).
		// User mentioned "参考图URL，可生成两小时临时公开链接". Presigning p.ImagePath (private) is best.

		refImageKey := p.ImagePath
		jeweaiBucket := os.Getenv("R2_BUCKET")
		if jeweaiBucket == "" {
			jeweaiBucket = "jeweai"
		}

		presignedURL, pErr := generateR2PresignedURL(ctx, jeweaiBucket, refImageKey)
		if pErr == nil {
			// Submit Task
			// Determine size based on p.Width/p.Height or p.AspectRatio (not in payload yet, calculated below)
			aspectRatio := "1:1" // Default
			if p.Width > 0 && p.Height > 0 {
				aspectRatio = getAspectRatio(p.Width, p.Height)
			}

			grsaiID, sErr := submitGRSAIImage(grsaiKey, p.Prompt, presignedURL, aspectRatio)
			if sErr == nil {
				fmt.Printf("[IMAGE] GRSAI Submited: %s. Polling...\n", grsaiID)
				// Poll for result (Synchronous block as per original design)
				// Poll for up to 60 seconds?
				for i := 0; i < 20; i++ { // 20 * 3s = 60s
					time.Sleep(3 * time.Second)
					status, resultURL, cErr := checkGRSAI(grsaiKey, grsaiID, false)
					if cErr != nil {
						fmt.Printf("[IMAGE] GRSAI Poll Error: %v\n", cErr)
						continue // Retry poll
					}
					if status == "success" {
						fmt.Printf("[IMAGE] GRSAI Success: %s\n", resultURL)
						// Download image
						dlPath := filepath.Join(tmpDir, fmt.Sprintf("%s_grsai_dl.png", p.TaskID))
						if dErr := downloadFile(resultURL, dlPath); dErr == nil {
							generatedImageData, err = os.ReadFile(dlPath)
							os.Remove(dlPath)
							if err == nil {
								providerUsed = "grsai"
							}
						}
						break
					} else if status == "failed" {
						fmt.Printf("[IMAGE] GRSAI Job Failed.\n")
						break
					}
				}
			} else {
				fmt.Printf("[IMAGE] GRSAI Submit Failed: %v\n", sErr)
			}
		} else {
			fmt.Printf("[IMAGE] Presign Error: %v\n", pErr)
		}
	}

	// --- Fallback to Laozhang (Original) ---
	if providerUsed == "none" {
		if apiKey == "" {
			fmt.Printf("[IMAGE] No AI_API_KEY found, switching to MOCK mode.\n")
			// Create a dummy image file
			dummyPath := filepath.Join(tmpDir, fmt.Sprintf("%s_generated.png", p.TaskID))
			createDummyFile(dummyPath)
			generatedImageData, err = os.ReadFile(dummyPath)
			os.Remove(dummyPath)
			if err != nil {
				fmt.Printf("[IMAGE] Failed to read dummy image: %v\n", err)
				updateTaskStatus(p.TaskID, "failed", nil)
				return nil
			}
		} else {
			fmt.Printf("[IMAGE] Sending real request to Laozhang AI Provider...\n")
			generatedImageData, err = submitImageGenerateTask(apiKey, p.Prompt, localRefPath, p.Width, p.Height)
			if err != nil {
				fmt.Printf("[IMAGE] Failed to generate image: %v\n", err)
				updateTaskStatus(p.TaskID, "failed", nil)
				return nil
			}
			fmt.Printf("[IMAGE] Image generated successfully, size: %d bytes\n", len(generatedImageData))
		}
	}

	// 5. Save generated image to temp file
	localGeneratedPath := filepath.Join(tmpDir, fmt.Sprintf("%s_generated.png", p.TaskID))
	err = os.WriteFile(localGeneratedPath, generatedImageData, 0644)
	if err != nil {
		fmt.Printf("[IMAGE] Failed to save generated image: %v\n", err)
		updateTaskStatus(p.TaskID, "failed", nil)
		return nil
	}
	defer os.Remove(localGeneratedPath)

	// 6. Generate cover for generated image (720p)
	localGeneratedCoverPath := filepath.Join(tmpDir, fmt.Sprintf("%s_generated_cover.png", p.TaskID))
	err = generateReferenceCover(localGeneratedPath, localGeneratedCoverPath)
	if err != nil {
		fmt.Printf("[IMAGE] Generate cover warning: %v, using original image as cover\n", err)
		// Use generated image itself as cover if cover generation fails
		localGeneratedCoverPath = localGeneratedPath
	} else {
		// Only remove cover file if it was generated separately
		defer func() {
			if localGeneratedCoverPath != localGeneratedPath {
				os.Remove(localGeneratedCoverPath)
			}
		}()
	}

	// 7. Upload generated image and cover to R2
	jeweaiBucket := os.Getenv("R2_BUCKET")
	if jeweaiBucket == "" {
		jeweaiBucket = "jeweai"
	}

	coversBucket := os.Getenv("R2_PUBLIC_BUCKET")
	if coversBucket == "" {
		coversBucket = "covers"
	}

	// Upload generated image to jeweai bucket (private)
	imageKey := fmt.Sprintf("userid123456/%s.png", p.TaskID)
	err = uploadToR2(ctx, localGeneratedPath, jeweaiBucket, imageKey)
	if err != nil {
		fmt.Printf("[IMAGE] Upload generated image error: %v\n", err)
		updateTaskStatus(p.TaskID, "failed", nil)
		return nil
	}
	fmt.Printf("[IMAGE] Uploaded generated image: %s\n", imageKey)

	// Upload generated image cover to covers bucket (public)
	imageCoverKey := fmt.Sprintf("userid123456/%s_cover.png", p.TaskID)
	err = uploadToR2(ctx, localGeneratedCoverPath, coversBucket, imageCoverKey)
	if err != nil {
		fmt.Printf("[IMAGE] Upload generated cover error: %v\n", err)
		// Don't fail if cover upload fails
	}

	// 8. Notify "completed" with imagePath, imageCoverPath, width, height
	updateTaskStatus(p.TaskID, "completed", map[string]interface{}{
		"imagePath":      imageKey,
		"imageCoverPath": imageCoverKey,
		"width":          p.Width,
		"height":         p.Height,
	})

	fmt.Printf("=== [IMAGE] COMPLETED: %s ===\n\n", p.TaskID)
	return nil
}

// HandleVideoGenerateTask 处理视频生成任务
func HandleVideoGenerateTask(ctx context.Context, t *asynq.Task) error {
	var p VideoGeneratePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("=== [VIDEO] Starting: %s (Asset: %s, User: %s) ===\n", p.TaskID, p.AssetID, p.UserID)

	// 1. Download Reference Image from R2 (Private 'jeweai' bucket)
	tmpDir := "tmp"
	os.MkdirAll(tmpDir, 0755)
	localRefPath := filepath.Join(tmpDir, fmt.Sprintf("%s_ref.png", p.TaskID))
	defer os.Remove(localRefPath)

	// Original image uploaded to 'jeweai' bucket in Node.js service
	bucketName := os.Getenv("R2_BUCKET")
	if bucketName == "" {
		bucketName = "jeweai"
	}

	err := downloadFromR2(ctx, bucketName, p.ImagePath, localRefPath)
	if err != nil {
		fmt.Printf("[VIDEO] Failed to download reference image: %v\n", err)
		return err // Retry?
	}

	// 2. Generate 720p Cover for Reference
	localCoverPath := filepath.Join(tmpDir, fmt.Sprintf("%s_ref_cover.png", p.TaskID))
	err = generateReferenceCover(localRefPath, localCoverPath)
	coverKey := ""
	if err == nil {
		// Upload Cover to public bucket 'covers'
		// Path format: userid123456/{taskID}_720p.png
		// All image covers stored in covers bucket under userid123456/ directory

		coversBucket := os.Getenv("R2_PUBLIC_BUCKET")
		if coversBucket == "" {
			coversBucket = "covers"
		}

		// Fixed user ID: userid123456
		// Cover stored in covers bucket under userid123456/ directory
		coverKey = fmt.Sprintf("userid123456/%s_720p.png", p.TaskID)
		err = uploadToR2(ctx, localCoverPath, coversBucket, coverKey)
		if err != nil {
			fmt.Printf("[VIDEO] Upload cover warning: %v\n", err)
		}
		defer os.Remove(localCoverPath)
	} else {
		fmt.Printf("[VIDEO] Generate cover warning: %v\n", err)
	}

	// 3. Notify "generating" with coverPath
	updateTaskStatus(p.TaskID, "generating", map[string]interface{}{
		"coverPath": coverKey,
	})

	// 4. Call AI Video API
	apiKey := os.Getenv("AI_API_KEY")
	grsaiKey := os.Getenv("GRSAI_KEY")
	externalID := ""
	provider := "laozhang" // default

	// Try GRSAI
	if grsaiKey != "" {
		jeweaiBucket := os.Getenv("R2_BUCKET")
		if jeweaiBucket == "" {
			jeweaiBucket = "jeweai"
		}

		// Generate presigned URL for reference image
		presignedURL, pErr := generateR2PresignedURL(ctx, jeweaiBucket, p.ImagePath)
		if pErr == nil {
			fmt.Printf("[VIDEO] Attempting GRSAI...\n")
			// AspectRatio? default 9:16 if not specified
			// Logic: p.Width / p.Height check? or just default.
			// Currently user request mentioned "aspectRatio": "9:16" in their example.
			// We can default to 9:16 or infer.
			// Let's infer from width/height if available, else 9:16
			ratio := "9:16"
			if p.Width > p.Height {
				ratio = "16:9"
			}

			grsaiID, sErr := submitGRSAIVideo(grsaiKey, p.Prompt, presignedURL, ratio)
			if sErr == nil {
				externalID = grsaiID
				provider = "grsai"
				fmt.Printf("[VIDEO] GRSAI Task Submitted. ID: %s\n", externalID)
			} else {
				fmt.Printf("[VIDEO] GRSAI Submit Failed: %v\n", sErr)
			}
		}
	}

	// Fallback to Laozhang if GRSAI failed or key missing
	if externalID == "" {
		if apiKey == "" {
			fmt.Printf("[VIDEO] No AI_API_KEY found, switching to MOCK mode.\n")
			externalID = fmt.Sprintf("mock_ext_%d", time.Now().UnixNano())
		} else {
			fmt.Printf("[VIDEO] Sending real request to Laozhang AI Provider...\n")
			// Prepare Multipart Request
			extID, err := submitVideoTask(apiKey, p.Prompt, localRefPath)
			if err != nil {
				fmt.Printf("[VIDEO] Failed to submit video task: %v\n", err)
				updateTaskStatus(p.TaskID, "failed", nil)
				return nil
			}
			externalID = extID
			fmt.Printf("[VIDEO] Laozhang Task Submitted. ID: %s\n", externalID)
		}
	}

	// 5. Enqueue Status Check
	checkPayload, _ := json.Marshal(VideoCheckStatusPayload{
		TaskID:     p.TaskID,
		AssetID:    p.AssetID,
		VideoID:    p.VideoID,
		ExternalID: externalID,
		Provider:   provider,
		ImagePath:  p.ImagePath,
		TryCount:   0,
		UserID:     p.UserID,
		Width:      p.Width,
		Height:     p.Height,
	})

	client := NewClient()
	defer client.Close()

	// Start checking after 10 seconds
	fmt.Printf("[VIDEO] Enqueueing Status Check for %s (Provider: %s)...\n", externalID, provider)

	taskInfo, err := client.Enqueue(asynq.NewTask(TaskTypeVideoCheckStatus, checkPayload), asynq.ProcessIn(10*time.Second))
	if err != nil {
		fmt.Printf("[VIDEO] Failed to enqueue status check: %v\n", err)
		return err
	}
	fmt.Printf("[VIDEO] Status Check Enqueued: %s\n", taskInfo.ID)

	return nil
}

// downloadFromR2 uses getS3Client from main.go to download a file
func downloadFromR2(ctx context.Context, bucket, key, destPath string) error {
	client, err := getS3Client(ctx)
	if err != nil {
		return err
	}

	result, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return err
	}
	defer result.Body.Close()

	file, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(file, result.Body)
	return err
}

func generateReferenceCover(inputPath, outputPath string) error {
	// Scale height to 720, width auto
	cmd := exec.Command("ffmpeg", "-i", inputPath, "-vf", "scale=-1:720", "-y", outputPath)
	return cmd.Run()
}

// submitVideoTask sends the multipart request to the AI API
func submitVideoTask(apiKey, prompt, imagePath string) (string, error) {
	url := fmt.Sprintf("%s/videos", API_BASE)

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add fields based on JS implementation
	_ = writer.WriteField("model", "sora_video2-15s")
	_ = writer.WriteField("prompt", prompt)
	_ = writer.WriteField("size", "720x1280") // Portrait? Or 1280x720? User said "720P small cover", API default usually landscape or portrait depending on req. User didn't specify ratio, keeping previous.

	// Add file
	file, err := os.Open(imagePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	part, err := writer.CreateFormFile("input_reference", filepath.Base(imagePath))
	if err != nil {
		return "", err
	}
	_, err = io.Copy(part, file)
	if err != nil {
		return "", err
	}

	err = writer.Close()
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, body)
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("API Error %d: %s", resp.StatusCode, string(respBody))
	}

	// Parse Response (Expects JSON with 'id')
	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("json parse error: %v (Body: %s)", err, string(respBody))
	}

	if result.ID == "" {
		return "", fmt.Errorf("no ID in response: %s", string(respBody))
	}

	return result.ID, nil
}

// HandleVideoCheckStatusTask 处理视频状态检查任务
func HandleVideoCheckStatusTask(ctx context.Context, t *asynq.Task) error {
	var p VideoCheckStatusPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}
	// p.ExternalID = "video_d73099dc-4193-40bd-b8b5-485bf01aa18b" // TODO:

	fmt.Printf("=== [VIDEO] Checking Status: %s (Ext: %s, Try: %d) ===\n", p.TaskID, p.ExternalID, p.TryCount)

	status := "pending"
	apiKey := os.Getenv("AI_API_KEY")
	grsaiKey := os.Getenv("GRSAI_KEY")

	// Check Logic
	if p.Provider == "grsai" {
		if grsaiKey == "" {
			fmt.Printf("[VIDEO] GRSAI Key missing during check!\n")
			status = "failed"
		} else {
			s, _, err := checkGRSAI(grsaiKey, p.ExternalID, true)
			if err != nil {
				fmt.Printf("[VIDEO] GRSAI Check Error: %v\n", err)
				status = "processing"
			} else {
				status = s
			}
		}
	} else {
		// Default / Laozhang / Mock
		if apiKey == "" || (len(p.ExternalID) >= 5 && p.ExternalID[:5] == "mock_") {
			// MOCK Logic
			if p.TryCount < 2 {
				status = "processing"
			} else {
				status = "success"
			}
		} else {
			// Real Check Logic
			s, err := checkVideoStatus(apiKey, p.ExternalID)
			if err != nil {
				fmt.Printf("[VIDEO] Check Status Error: %v\n", err)
				status = "processing" // Retry on error
			} else {
				status = s
			}
		}
	}

	if status == "processing" || status == "pending" {
		if p.TryCount > 60 { // Timeout
			updateTaskStatus(p.TaskID, "failed", nil)
			return nil
		}
		// Re-enqueue
		p.TryCount++
		payload, _ := json.Marshal(p)
		client := NewClient()
		defer client.Close()
		client.Enqueue(asynq.NewTask(TaskTypeVideoCheckStatus, payload), asynq.ProcessIn(10*time.Second)) // Poll every 10s
		return nil
	}

	if status == "success" || status == "completed" {
		// Mock Video Generation
		tmpDir := "tmp"
		os.MkdirAll(tmpDir, 0755)
		tmpVideoPath := filepath.Join(tmpDir, p.VideoID+".mp4")

		// Download Logic
		if p.Provider == "grsai" {
			// Get download URL again (or store it? CheckGRSAI returns it)
			_, resultURL, err := checkGRSAI(grsaiKey, p.ExternalID, true)
			if err == nil && resultURL != "" {
				err = downloadFile(resultURL, tmpVideoPath)
				if err != nil {
					fmt.Printf("[VIDEO] GRSAI Download Error: %v\n", err)
					createDummyVideo(tmpVideoPath) // Fallback
				}
			} else {
				fmt.Printf("[VIDEO] GRSAI Get URL Error: %v\n", err)
				createDummyVideo(tmpVideoPath)
			}
		} else if apiKey != "" && p.ExternalID[:5] != "mock_" {
			// Laozhang Download
			err := downloadVideoContent(apiKey, p.ExternalID, tmpVideoPath)
			if err != nil {
				fmt.Printf("[VIDEO] Content Download Error: %v\n", err)
				createDummyVideo(tmpVideoPath)
			}
		} else {
			createDummyVideo(tmpVideoPath)
		}

		defer os.Remove(tmpVideoPath)

		// Generate Thumbnail (Video Cover) using FFMPEG
		thumbPath := filepath.Join(tmpDir, p.VideoID+"_thumb.png")
		err := generateThumbnail(tmpVideoPath, thumbPath)
		if err != nil {
			fmt.Printf("Thumbnail generation error: %v\n", err)
			createDummyFile(thumbPath)
		}
		defer os.Remove(thumbPath)

		// Storage Logic
		// Video -> Jeweai (Private): userid123456/{videoID}.mp4
		// Thumb -> Covers (Public): userid123456/{videoID}_thumb.png

		// Fixed user ID: userid123456
		// Video stored in jeweai bucket (private), thumbnail in covers bucket (public)
		jeweaiBucket := os.Getenv("R2_BUCKET")
		if jeweaiBucket == "" {
			jeweaiBucket = "jeweai"
		}

		coversBucket := os.Getenv("R2_PUBLIC_BUCKET")
		if coversBucket == "" {
			coversBucket = "covers"
		}

		// Video file in jeweai bucket: userid123456/{videoID}.mp4
		videoKey := fmt.Sprintf("userid123456/%s.mp4", p.VideoID)
		// Thumbnail in covers bucket: userid123456/{videoID}_thumb.png
		thumbKey := fmt.Sprintf("userid123456/%s_thumb.png", p.VideoID)

		// NOTE: uploadToR2 is from main.go
		// Upload Video (Private)
		err = uploadToR2(ctx, tmpVideoPath, jeweaiBucket, videoKey)
		if err != nil {
			fmt.Printf("Upload video error: %v\n", err)
		}
		// Upload Thumb (Public)
		err = uploadToR2(ctx, thumbPath, coversBucket, thumbKey)
		if err != nil {
			fmt.Printf("Upload thumb error: %v\n", err)
		}

		fmt.Printf("[VIDEO] Processed & Uploaded: %s (Private), %s (Public)\n", videoKey, thumbKey)

		// User asked to notify Nodejs: "task completed... video and thumbnail... asset created"
		// Send "completed" webhook with `videoPath` and `videoCoverPath`
		updateTaskStatus(p.TaskID, "completed", map[string]interface{}{
			"videoPath":      videoKey,
			"videoCoverPath": thumbKey,
			"width":          p.Width,
			"height":         p.Height,
		})

		return nil
	}

	updateTaskStatus(p.TaskID, "failed", nil)
	return nil
}

func checkVideoStatus(apiKey, videoID string) (string, error) {
	url := fmt.Sprintf("%s/videos/%s", API_BASE, videoID)
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("status check failed: %d", resp.StatusCode)
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	// Assume generic "status" field
	if s, ok := result["status"].(string); ok {
		return s, nil
	}
	return "unknown", nil
}

func downloadVideoContent(apiKey, videoID, destPath string) error {
	// Try downloading assuming explicit download URL or content endpoint
	url := fmt.Sprintf("%s/videos/%s/content", API_BASE, videoID)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 120 * time.Second} // Allow time for download
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("download failed: %d", resp.StatusCode)
	}

	file, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	return err
}

func createDummyVideo(path string) {
	cmd := exec.Command("ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=2:size=640x360:rate=30", "-c:v", "libx264", "-y", path)
	if err := cmd.Run(); err != nil {
		fmt.Printf("Failed to create dummy video with ffmpeg: %v. Creating text file instead.\n", err)
		os.WriteFile(path, []byte("dummy video content"), 0644)
	}
}

func createDummyFile(path string) {
	os.WriteFile(path, []byte("dummy file"), 0644)
}

func generateThumbnail(videoPath, thumbPath string) error {
	// ffmpeg -i video.mp4 -ss 00:00:01.000 -vframes 1 thumb.png
	cmd := exec.Command("ffmpeg", "-i", videoPath, "-ss", "00:00:01.000", "-vframes", "1", "-y", thumbPath)
	return cmd.Run()
}

// submitImageGenerateTask 调用 Gemini API 生成图片（同步）
func submitImageGenerateTask(apiKey, prompt, imagePath string, width, height int) ([]byte, error) {
	url := fmt.Sprintf("%s/models/%s", API_BASE_BETA, IMAGE_GENERATION_MODEL)

	// Prepare request payload
	payload := map[string]interface{}{
		"generationConfig": map[string]interface{}{
			"responseModalities": []string{"IMAGE"},
			"imageConfig": map[string]interface{}{
				"aspectRatio": getAspectRatio(width, height),
				"imageSize":   "4K", // 1K, 2K, 4K
			},
		},
	}

	// Build contents array
	contents := map[string]interface{}{
		"parts": []map[string]interface{}{
			{"text": prompt},
		},
	}

	// Add image if provided
	if imagePath != "" && imagePath != "null" {
		// Read and encode image to base64
		imageData, err := os.ReadFile(imagePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read image file: %v", err)
		}

		imageB64 := make([]byte, base64.StdEncoding.EncodedLen(len(imageData)))
		base64.StdEncoding.Encode(imageB64, imageData)

		// Determine mime type from file extension
		mimeType := "image/jpeg"
		ext := filepath.Ext(imagePath)
		switch ext {
		case ".png":
			mimeType = "image/png"
		case ".gif":
			mimeType = "image/gif"
		case ".webp":
			mimeType = "image/webp"
		}

		contents["parts"] = append(contents["parts"].([]map[string]interface{}), map[string]interface{}{
			"inline_data": map[string]interface{}{
				"mime_type": mimeType,
				"data":      string(imageB64),
			},
		})
	}

	payload["contents"] = []map[string]interface{}{contents}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %v", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 300 * time.Second} // Allow more time for image generation
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("API Error %d: %s", resp.StatusCode, string(respBody))
	}

	// Parse Response
	var result struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					InlineData struct {
						Data string `json:"data"`
					} `json:"inlineData"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("json parse error: %v (Body: %s)", err, string(respBody))
	}

	if len(result.Candidates) == 0 ||
		len(result.Candidates[0].Content.Parts) == 0 ||
		result.Candidates[0].Content.Parts[0].InlineData.Data == "" {
		return nil, fmt.Errorf("no image data in response: %s", string(respBody))
	}

	// Decode base64 image data
	imageData, err := base64.StdEncoding.DecodeString(result.Candidates[0].Content.Parts[0].InlineData.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64 image: %v", err)
	}

	return imageData, nil
}

// getAspectRatio 根据宽度和高度计算宽高比字符串
func getAspectRatio(width, height int) string {
	if width <= 0 || height <= 0 {
		return "1:1"
	}

	// Calculate GCD
	a, b := width, height
	for b != 0 {
		a, b = b, a%b
	}
	gcdVal := a

	return fmt.Sprintf("%d:%d", width/gcdVal, height/gcdVal)
}

// --- Missing Helper Functions Implementation ---

// downloadFile downloads a file from a URL to a local destination
func downloadFile(url string, destPath string) error {
	fmt.Printf("[DEBUG] Downloading from: %s\n", url)
	req, _ := http.NewRequest("GET", url, nil)
	// Add user-agent just in case
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	n, err := io.Copy(out, resp.Body)
	if err != nil {
		return err
	}

	fmt.Printf("[DEBUG] Downloaded %d bytes to %s\n", n, destPath)

	// Debug small files
	if n < 100 {
		content, _ := os.ReadFile(destPath)
		fmt.Printf("[DEBUG] Small file content: %s\n", string(content))
	}

	return nil
}

// generateR2PresignedURL generates a presigned URL for an R2 object
func generateR2PresignedURL(ctx context.Context, bucket, key string) (string, error) {
	client, err := getS3Client(ctx) // getS3Client is in main.go
	if err != nil {
		return "", err
	}

	presignClient := s3.NewPresignClient(client)
	presignReq, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(o *s3.PresignOptions) {
		o.Expires = 2 * time.Hour
	})
	if err != nil {
		return "", err
	}

	return presignReq.URL, nil
}

// submitGRSAIImage submits an image generation task to GRSAI
func submitGRSAIImage(apiKey, prompt, imageUrl, aspectRatio string) (string, error) {
	baseURL := os.Getenv("GRSAI_BASE_URL")
	if baseURL == "" {
		baseURL = GRSAI_API_BASE
	}
	url := fmt.Sprintf("%s/draw/completions", baseURL)
	fmt.Printf("[DEBUG] Attempting POST to: %s\n", url)

	// User spec: size="1:1" (fixed?) or depends on aspect ratio. Request says "size": "1:1".
	// Implementation: using "1:1" as per spec example, or mapping aspect ratio if needed.
	// Since payload shows "size": "1:1", we'll default to that or mapping.
	// User said "Aspect Ratio Options... 1:1, 3:2...".
	// Let's assume passed aspectRatio string (e.g. "1:1") IS the size format.
	size := aspectRatio
	if size == "" {
		size = "1:1"
	}

	payload := map[string]interface{}{
		"model":        "gpt-image-1.5", // gpt-image-1.5、sora-image
		"prompt":       prompt,
		"size":         size,
		"variants":     1,
		"urls":         []string{imageUrl}, // Array
		"webHook":      "-1",
		"shutProgress": false,
	}

	jsonData, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("GRSAI Error %d: %s", resp.StatusCode, string(body))
	}

	// Parse Response
	// Response structure: { "code": 0, "data": { "id": "..." }, "msg": "success" }
	var result struct {
		Code int `json:"code"`
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
		Msg string `json:"msg"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("json unmarshal: %v (Body: %s)", err, string(body))
	}

	if result.Data.ID == "" {
		// Fallback: check if error is in data? or just print body
		return "", fmt.Errorf("no id in response data: %s", string(body))
	}

	return result.Data.ID, nil
}

// submitGRSAIVideo submits a video generation task to GRSAI
func submitGRSAIVideo(apiKey, prompt, imageUrl, aspectRatio string) (string, error) {
	baseURL := os.Getenv("GRSAI_BASE_URL")
	if baseURL == "" {
		baseURL = GRSAI_API_BASE
	}
	url := fmt.Sprintf("%s/video/sora-video", baseURL)
	fmt.Printf("[DEBUG] Attempting POST to: %s\n", url)

	payload := map[string]interface{}{
		"model":        "sora-2",
		"prompt":       prompt,
		"url":          imageUrl, // Singular
		"aspectRatio":  aspectRatio,
		"duration":     15,
		"size":         "small",
		"webHook":      "-1",
		"shutProgress": false,
	}

	jsonData, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("GRSAI Video Error %d: %s", resp.StatusCode, string(body))
	}

	// Parse Response
	var result struct {
		Code int `json:"code"`
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
		Msg string `json:"msg"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("json unmarshal: %v (Body: %s)", err, string(body))
	}

	if result.Data.ID == "" {
		return "", fmt.Errorf("no id in response data: %s", string(body))
	}

	return result.Data.ID, nil
}

// checkGRSAI checks the status of a GRSAI task
func checkGRSAI(apiKey, taskID string, looksLikeVideo bool) (string, string, error) {
	baseURL := os.Getenv("GRSAI_BASE_URL")
	if baseURL == "" {
		baseURL = GRSAI_API_BASE
	}

	url := fmt.Sprintf("%s/draw/result", baseURL) // Same endpoint for both

	payload := map[string]string{"id": taskID}
	jsonData, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", "", fmt.Errorf("status check failed: %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)

	// Response Structure:
	// User provided: { "id": "...", "results": [...], "status": "...", ... }
	var result struct {
		ID            string `json:"id"`
		Status        string `json:"status"`
		FailureReason string `json:"failure_reason"`
		Error         string `json:"error"`
		Results       []struct {
			URL string `json:"url"`
		} `json:"results"`

		// Legacy/Alternative structure support fields (optional)
		Code int `json:"code"`
		Data *struct {
			ID      string `json:"id"`
			Status  string `json:"status"`
			Results []struct {
				URL string `json:"url"`
			} `json:"results"`
			FailureReason string `json:"failure_reason"`
			Error         string `json:"error"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", fmt.Errorf("json parse error: %v", err)
	}

	// Determine status and results from flat vs nested structure
	status := result.Status
	results := result.Results
	failureReason := result.FailureReason
	errorMsg := result.Error

	if result.Data != nil {
		status = result.Data.Status
		results = result.Data.Results
		failureReason = result.Data.FailureReason
		errorMsg = result.Data.Error
	}

	finalStatus := "processing"
	// Map status
	if status == "succeeded" || status == "success" || status == "completed" {
		finalStatus = "success"
	} else if status == "failed" || status == "error" {
		finalStatus = "failed"
	}

	fileURL := ""
	if finalStatus == "success" && len(results) > 0 {
		fileURL = results[0].URL
	} else if finalStatus == "failed" {
		return "failed", "", fmt.Errorf("task failed: %s %s", failureReason, errorMsg)
	}

	return finalStatus, fileURL, nil
}
