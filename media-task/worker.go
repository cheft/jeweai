package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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
	// 图片任务1：开始生成
	TaskTypeImageGenerate = "image:generate"
	// 图片任务2：检查状态
	TaskTypeImageCheckStatus = "image:check_status"
	// 视频任务1：开始生成
	TaskTypeVideoGenerate = "video:generate"
	// 视频任务2：检查状态
	TaskTypeVideoCheckStatus = "video:check_status"

	// GRSAI Constants
	GRSAI_API_BASE = "https://grsai.dakka.com.cn/v1"
)

// Helper to update task status in SvelteKit
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
	TaskID     string `json:"TaskID"`
	AssetID    string `json:"AssetID"`
	ImagePath  string `json:"ImagePath"`
	Width      int    `json:"Width"`
	Height     int    `json:"Height"`
	ImgName    string `json:"ImgName"`
	Prompt     string `json:"Prompt"`
	StyleID    string `json:"StyleID"`
	ExternalID string `json:"ExternalID"` // For retries
}

type ImageCheckStatusPayload struct {
	TaskID     string `json:"TaskID"`
	AssetID    string `json:"AssetID"`
	ExternalID string `json:"ExternalID"`
	ImagePath  string `json:"ImagePath"` // Reference image path (if any)
	TryCount   int    `json:"TryCount"`
	Width      int    `json:"Width"`
	Height     int    `json:"Height"`
}

type VideoGeneratePayload struct {
	TaskID     string `json:"TaskID"`
	AssetID    string `json:"AssetID"`
	VideoID    string `json:"VideoID"` // Internal ID
	Prompt     string `json:"Prompt"`
	ImagePath  string `json:"ImagePath"`
	StyleID    string `json:"StyleID"`
	UserID     string `json:"UserID"`
	Width      int    `json:"Width"`
	Height     int    `json:"Height"`
	ExternalID string `json:"ExternalID"` // For retries
}

type VideoCheckStatusPayload struct {
	TaskID     string `json:"TaskID"`
	AssetID    string `json:"AssetID"`
	VideoID    string `json:"VideoID"` // Internal ID
	ExternalID string `json:"ExternalID"`
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

	// 4. Call GRSAI Image Generation API
	grsaiKey := os.Getenv("GRSAI_KEY")
	if grsaiKey == "" {
		fmt.Printf("[IMAGE] GRSAI_KEY not found\n")
		updateTaskStatus(p.TaskID, "failed", nil)
		return nil
	}

	fmt.Printf("[IMAGE] Attempting GRSAI...\n")
	jeweaiBucket := os.Getenv("R2_BUCKET")
	if jeweaiBucket == "" {
		jeweaiBucket = "jeweai"
	}

	presignedURL, pErr := generateR2PresignedURL(ctx, jeweaiBucket, p.ImagePath)
	if pErr != nil {
		fmt.Printf("[IMAGE] Presign Error: %v\n", pErr)
		updateTaskStatus(p.TaskID, "failed", nil)
		return nil
	}

	// Determine size based on p.Width/p.Height
	aspectRatio := "1:1" // Default
	if p.Width > 0 && p.Height > 0 {
		aspectRatio = getAspectRatio(p.Width, p.Height)
	}

	grsaiID := p.ExternalID
	if grsaiID == "" {
		fmt.Printf("[IMAGE] Attempting GRSAI...\n")
		var sErr error
		grsaiID, sErr = submitGRSAIImage(grsaiKey, p.Prompt, presignedURL, aspectRatio)
		if sErr != nil {
			fmt.Printf("[IMAGE] GRSAI Submit Failed: %v\n", sErr)
			updateTaskStatus(p.TaskID, "failed", nil)
			return nil
		}
		fmt.Printf("[IMAGE] GRSAI Submitted: %s. Enqueueing Poll...\n", grsaiID)

		// Notify "generating" with ExternalID
		updateTaskStatus(p.TaskID, "generating", map[string]interface{}{
			"externalId": grsaiID,
		})
	} else {
		fmt.Printf("[IMAGE] Skipping GRSAI submission, using existing ID: %s\n", grsaiID)
	}

	// 5. Enqueue Status Check
	checkPayload, _ := json.Marshal(ImageCheckStatusPayload{
		TaskID:     p.TaskID,
		AssetID:    p.AssetID,
		ExternalID: grsaiID,
		ImagePath:  p.ImagePath,
		TryCount:   0,
		Width:      p.Width,
		Height:     p.Height,
	})

	client := NewClient()
	defer client.Close()

	if _, err := client.Enqueue(asynq.NewTask(TaskTypeImageCheckStatus, checkPayload), asynq.Queue("media"), asynq.ProcessIn(5*time.Second)); err != nil {
		fmt.Printf("[IMAGE] Failed to enqueue status check: %v\n", err)
		return err
	}
	fmt.Printf("[IMAGE] Status Check Enqueued for %s\n", grsaiID)

	return nil
}

// HandleImageCheckStatusTask 处理图片状态检查任务
func HandleImageCheckStatusTask(ctx context.Context, t *asynq.Task) error {
	var p ImageCheckStatusPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("=== [IMAGE] Checking Status: %s (Ext: %s, Try: %d) ===\n", p.TaskID, p.ExternalID, p.TryCount)

	grsaiKey := os.Getenv("GRSAI_KEY")
	if grsaiKey == "" {
		fmt.Printf("[IMAGE] GRSAI Key missing during check!\n")
		updateTaskStatus(p.TaskID, "failed", nil)
		return nil
	}

	status, resultURL, failureReason, errorMsg, err := checkGRSAI(grsaiKey, p.ExternalID, false)
	if err != nil {
		fmt.Printf("[IMAGE] GRSAI Check Error: %v\n", err)
		// On network error or similar, we might want to retry
		status = "processing"
	}

	if status == "processing" || status == "pending" {
		if p.TryCount > 60 { // Timeout (60 * 5s = 300s)
			fmt.Printf("[IMAGE] Polling Timeout: %s\n", p.TaskID)
			updateTaskStatus(p.TaskID, "failed", nil)
			return nil
		}
		// Re-enqueue
		p.TryCount++
		payload, _ := json.Marshal(p)
		client := NewClient()
		defer client.Close()
		client.Enqueue(asynq.NewTask(TaskTypeImageCheckStatus, payload), asynq.Queue("media"), asynq.ProcessIn(5*time.Second))
		return nil
	}

	if status == "success" {
		fmt.Printf("[IMAGE] GRSAI Success: %s\n", resultURL)
		return processImageResult(ctx, p, resultURL)
	}

	fmt.Printf("[IMAGE] Task Failed or Error: %s (Reason: %s, Error: %s)\n", status, failureReason, errorMsg)
	updateTaskStatus(p.TaskID, "failed", map[string]interface{}{
		"failureReason": failureReason,
		"errorMessage":  errorMsg,
	})
	return nil
}

// processImageResult handles the download and storage of the generated image
func processImageResult(ctx context.Context, p ImageCheckStatusPayload, resultURL string) error {
	tmpDir := "tmp"
	os.MkdirAll(tmpDir, 0755)

	dlPath := filepath.Join(tmpDir, fmt.Sprintf("%s_generated.png", p.TaskID))
	if err := downloadFile(resultURL, dlPath); err != nil {
		fmt.Printf("[IMAGE] Download Error: %v\n", err)
		updateTaskStatus(p.TaskID, "failed", map[string]interface{}{
			"failureReason": "error",
			"errorMessage":  "system error",
		})
		return nil
	}
	defer os.Remove(dlPath)

	// 6. Generate cover for generated image (720p)
	localGeneratedCoverPath := filepath.Join(tmpDir, fmt.Sprintf("%s_generated_cover.png", p.TaskID))
	if err := generateReferenceCover(dlPath, localGeneratedCoverPath); err != nil {
		fmt.Printf("[IMAGE] Generate cover warning: %v, using original image as cover\n", err)
		localGeneratedCoverPath = dlPath
	} else {
		defer os.Remove(localGeneratedCoverPath)
	}

	// 7. Upload to R2
	jeweaiBucket := os.Getenv("R2_BUCKET")
	if jeweaiBucket == "" {
		jeweaiBucket = "jeweai"
	}
	coversBucket := os.Getenv("R2_PUBLIC_BUCKET")
	if coversBucket == "" {
		coversBucket = "covers"
	}

	imageKey := fmt.Sprintf("userid123456/%s.png", p.TaskID)
	if err := uploadToR2(ctx, dlPath, jeweaiBucket, imageKey); err != nil {
		fmt.Printf("[IMAGE] Upload generated image error: %v\n", err)
		updateTaskStatus(p.TaskID, "failed", map[string]interface{}{
			"failureReason": "error",
			"errorMessage":  "system error",
		})
		return nil
	}

	imageCoverKey := fmt.Sprintf("userid123456/%s_cover.png", p.TaskID)
	if err := uploadToR2(ctx, localGeneratedCoverPath, coversBucket, imageCoverKey); err != nil {
		fmt.Printf("[IMAGE] Upload generated cover error: %v\n", err)
	}

	// 8. Notify "completed"
	updateTaskStatus(p.TaskID, "completed", map[string]interface{}{
		"imagePath":      imageKey,
		"imageCoverPath": imageCoverKey,
		"width":          p.Width,
		"height":         p.Height,
	})

	fmt.Printf("=== [IMAGE] COMPLETED: %s ===\n", p.TaskID)
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

	// 4. Call GRSAI Video API
	grsaiKey := os.Getenv("GRSAI_KEY")
	if grsaiKey == "" {
		fmt.Printf("[VIDEO] GRSAI_KEY not found\n")
		updateTaskStatus(p.TaskID, "failed", nil)
		return nil
	}

	jeweaiBucket := os.Getenv("R2_BUCKET")
	if jeweaiBucket == "" {
		jeweaiBucket = "jeweai"
	}

	presignedURL, pErr := generateR2PresignedURL(ctx, jeweaiBucket, p.ImagePath)
	if pErr != nil {
		fmt.Printf("[VIDEO] Presign Error: %v\n", pErr)
		updateTaskStatus(p.TaskID, "failed", nil)
		return nil
	}

	fmt.Printf("[VIDEO] Attempting GRSAI...\n")
	ratio := "9:16"
	if p.Width > p.Height {
		ratio = "16:9"
	}

	externalID := p.ExternalID
	if externalID == "" {
		fmt.Printf("[VIDEO] Attempting GRSAI...\n")
		var sErr error
		externalID, sErr = submitGRSAIVideo(grsaiKey, p.Prompt, presignedURL, ratio)
		if sErr != nil {
			fmt.Printf("[VIDEO] GRSAI Submit Failed: %v\n", sErr)
			updateTaskStatus(p.TaskID, "failed", nil)
			return nil
		}
		fmt.Printf("[VIDEO] GRSAI Task Submitted. ID: %s\n", externalID)

		// Notify "generating" with ExternalID
		updateTaskStatus(p.TaskID, "generating", map[string]interface{}{
			"coverPath":  coverKey,
			"externalId": externalID,
		})
	} else {
		fmt.Printf("[VIDEO] Skipping GRSAI submission, using existing ID: %s\n", externalID)
	}

	// 5. Enqueue Status Check
	checkPayload, _ := json.Marshal(VideoCheckStatusPayload{
		TaskID:     p.TaskID,
		AssetID:    p.AssetID,
		VideoID:    p.VideoID,
		ExternalID: externalID,
		ImagePath:  p.ImagePath,
		TryCount:   0,
		UserID:     p.UserID,
		Width:      p.Width,
		Height:     p.Height,
	})

	client := NewClient()
	defer client.Close()

	// Start checking after 10 seconds
	fmt.Printf("[VIDEO] Enqueueing Status Check for %s...\n", externalID)

	taskInfo, err := client.Enqueue(asynq.NewTask(TaskTypeVideoCheckStatus, checkPayload), asynq.Queue("media"), asynq.ProcessIn(10*time.Second))
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

func generateThumbnail(videoPath, thumbPath string) error {
	// ffmpeg -i video.mp4 -ss 00:00:01.000 -vframes 1 thumb.png
	cmd := exec.Command("ffmpeg", "-i", videoPath, "-ss", "00:00:01.000", "-vframes", "1", "-y", thumbPath)
	return cmd.Run()
}

// HandleVideoCheckStatusTask 处理视频状态检查任务
func HandleVideoCheckStatusTask(ctx context.Context, t *asynq.Task) error {
	var p VideoCheckStatusPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("=== [VIDEO] Checking Status: %s (Ext: %s, Try: %d) ===\n", p.TaskID, p.ExternalID, p.TryCount)

	grsaiKey := os.Getenv("GRSAI_KEY")
	if grsaiKey == "" {
		fmt.Printf("[VIDEO] GRSAI Key missing during check!\n")
		updateTaskStatus(p.TaskID, "failed", nil)
		return nil
	}

	status, resultURL, failureReason, errorMsg, err := checkGRSAI(grsaiKey, p.ExternalID, true)
	if err != nil {
		fmt.Printf("[VIDEO] GRSAI Check Error: %v\n", err)
		status = "processing" // Assume processing if there's an error checking status
	}

	if status == "processing" || status == "pending" {
		if p.TryCount > 60 { // Timeout (60 * 10s = 600s = 10min)
			fmt.Printf("[VIDEO] Polling Timeout: %s\n", p.TaskID)
			updateTaskStatus(p.TaskID, "failed", nil)
			return nil
		}
		// Re-enqueue
		p.TryCount++
		payload, _ := json.Marshal(p)
		client := NewClient()
		defer client.Close()
		client.Enqueue(asynq.NewTask(TaskTypeVideoCheckStatus, payload), asynq.Queue("media"), asynq.ProcessIn(10*time.Second))
		return nil
	}

	if status == "success" || status == "finish" {
		fmt.Printf("[VIDEO] GRSAI Success: %s\n", resultURL)
		return processVideoResult(ctx, p, resultURL)
	}

	fmt.Printf("[VIDEO] Task Failed or Error: %s (Reason: %s, Error: %s)\n", status, failureReason, errorMsg)
	updateTaskStatus(p.TaskID, "failed", map[string]interface{}{
		"failureReason": failureReason,
		"errorMessage":  errorMsg,
	})
	return nil
}

// processVideoResult handles the download and storage of the generated video
func processVideoResult(ctx context.Context, p VideoCheckStatusPayload, resultURL string) error {
	tmpDir := "tmp"
	os.MkdirAll(tmpDir, 0755)
	tmpVideoPath := filepath.Join(tmpDir, p.VideoID+".mp4")

	if err := downloadFile(resultURL, tmpVideoPath); err != nil {
		fmt.Printf("[VIDEO] Download Error: %v\n", err)
		updateTaskStatus(p.TaskID, "failed", map[string]interface{}{
			"failureReason": "error",
			"errorMessage":  "system error",
		})
		return nil
	}
	defer os.Remove(tmpVideoPath)

	// Generate Thumbnail (Video Cover) using FFMPEG
	thumbPath := filepath.Join(tmpDir, p.VideoID+"_thumb.png")
	if err := generateThumbnail(tmpVideoPath, thumbPath); err != nil {
		fmt.Printf("[VIDEO] Thumbnail generation error: %v\n", err)
		createDummyFile(thumbPath)
	}
	defer os.Remove(thumbPath)

	// Storage Logic
	jeweaiBucket := os.Getenv("R2_BUCKET")
	if jeweaiBucket == "" {
		jeweaiBucket = "jeweai"
	}
	coversBucket := os.Getenv("R2_PUBLIC_BUCKET")
	if coversBucket == "" {
		coversBucket = "covers"
	}

	videoKey := fmt.Sprintf("userid123456/%s.mp4", p.VideoID)
	thumbKey := fmt.Sprintf("userid123456/%s_thumb.png", p.VideoID)

	// Upload Video (Private)
	if err := uploadToR2(ctx, tmpVideoPath, jeweaiBucket, videoKey); err != nil {
		fmt.Printf("[VIDEO] Upload video error: %v\n", err)
		updateTaskStatus(p.TaskID, "failed", map[string]interface{}{
			"failureReason": "error",
			"errorMessage":  "system error",
		})
		return nil
	}

	// Upload Thumb (Public)
	if err := uploadToR2(ctx, thumbPath, coversBucket, thumbKey); err != nil {
		fmt.Printf("[VIDEO] Upload thumb error: %v\n", err)
	}

	fmt.Printf("[VIDEO] Processed & Uploaded: %s (Private), %s (Public)\n", videoKey, thumbKey)

	// Notify "completed"
	updateTaskStatus(p.TaskID, "completed", map[string]interface{}{
		"videoPath":      videoKey,
		"videoCoverPath": thumbKey,
		"width":          p.Width,
		"height":         p.Height,
	})

	return nil
}

func createDummyFile(path string) {
	os.WriteFile(path, []byte("dummy file"), 0644)
}

func createDummyVideo(path string) {
	cmd := exec.Command("ffmpeg", "-f", "lavfi", "-i", "testsrc=duration=2:size=640x360:rate=30", "-c:v", "libx264", "-y", path)
	if err := cmd.Run(); err != nil {
		fmt.Printf("Failed to create dummy video with ffmpeg: %v. Creating text file instead.\n", err)
		os.WriteFile(path, []byte("dummy video content"), 0644)
	}
}

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

	// Check if file is too small (e.g. less than 100 bytes is likely an error message)
	if n < 500 {
		content, _ := os.ReadFile(destPath)
		fmt.Printf("[DEBUG] Small file content alert: %s\n", string(content))
		os.Remove(destPath)
		return fmt.Errorf("downloaded file is too small (%d bytes), likely an error response: %s", n, string(content))
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
func checkGRSAI(apiKey, taskID string, looksLikeVideo bool) (status string, resultURL string, failureReason string, errorMsg string, err error) {
	baseURL := os.Getenv("GRSAI_BASE_URL")
	if baseURL == "" {
		baseURL = GRSAI_API_BASE
	}

	url := fmt.Sprintf("%s/draw/result", baseURL) // Same endpoint for both

	payload := map[string]string{"id": taskID}
	jsonData, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", "", "", "", err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", "", "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", "", "", "", fmt.Errorf("status check failed: %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)

	// Response Structure:
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
		return "", "", "", "", fmt.Errorf("json parse error: %v", err)
	}

	// Determine status and results from flat vs nested structure
	rawStatus := result.Status
	results := result.Results
	failureReason = result.FailureReason
	errorMsg = result.Error

	if result.Data != nil {
		rawStatus = result.Data.Status
		results = result.Data.Results
		failureReason = result.Data.FailureReason
		errorMsg = result.Data.Error
	}

	finalStatus := "processing"
	// Map status
	statusLower := ""
	if rawStatus != "" {
		statusLower = rawStatus
	}

	if statusLower == "succeeded" || statusLower == "success" || statusLower == "completed" || statusLower == "finish" {
		finalStatus = "success"
	} else if statusLower == "failed" || statusLower == "error" {
		finalStatus = "failed"
	}

	fileURL := ""
	if finalStatus == "success" && len(results) > 0 {
		fileURL = results[0].URL
	}

	return finalStatus, fileURL, failureReason, errorMsg, nil
}
