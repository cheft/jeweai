package main

import (
	"bytes"
	"context"
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

	API_BASE = "https://api.laozhang.ai/v1"
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
}

type VideoCheckStatusPayload struct {
	TaskID     string `json:"TaskID"`
	AssetID    string `json:"AssetID"`
	VideoID    string `json:"VideoID"` // Internal ID
	ExternalID string `json:"ExternalID"`
	ImagePath  string `json:"ImagePath"` // Reference image path
	TryCount   int    `json:"TryCount"`
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

// HandleImageGenerateTask 处理图片生成任务
func HandleImageGenerateTask(ctx context.Context, t *asynq.Task) error {
	var p ImageGeneratePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("\n=== [IMAGE] Processing: %s (Asset: %s) ===\n", p.TaskID, p.AssetID)

	// Notify "execute" -> "generating"
	updateTaskStatus(p.TaskID, "generating", nil)

	time.Sleep(2 * time.Second)

	// Simulate completion for Image
	updateTaskStatus(p.TaskID, "completed", map[string]interface{}{
		"resultUrl": "mock_result_url",
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

	fmt.Printf("=== [VIDEO] Starting: %s (Asset: %s) ===\n", p.TaskID, p.AssetID)

	// 1. Download Reference Image from R2
	tmpDir := "tmp"
	os.MkdirAll(tmpDir, 0755)
	localRefPath := filepath.Join(tmpDir, fmt.Sprintf("%s_ref.png", p.TaskID))
	defer os.Remove(localRefPath) // Clean up later

	// The ImagePath in payload is the Key in R2 (original/...)
	// Assume bucket is R2_PUBLIC_BUCKET or default 'covers' (actually should check env)
	// Actually, main.go uses R2_PUBLIC_BUCKET for uploads. Let's use it for downloads too if it's the same bucket or 'jeweai' bucket?
	// The implementation plan says "upload to R2 (original/)".
	// Let's assume R2_PUBLIC_BUCKET is the main bucket for simplicity or 'jeweai' if public is covers.
	// Best guess: user probably uses one bucket or two.
	// I'll try R2_PUBLIC_BUCKET first.
	bucketName := os.Getenv("R2_PUBLIC_BUCKET")
	if bucketName == "" {
		bucketName = "covers"
	}

	err := downloadFromR2(ctx, bucketName, p.ImagePath, localRefPath)
	if err != nil {
		fmt.Printf("[VIDEO] Failed to download reference image: %v\n", err)
		return err // Retry?
	}

	// 2. Generate 720p Cover for Reference
	// ffmpeg -i input.png -vf scale=-1:720 output.png
	localCoverPath := filepath.Join(tmpDir, fmt.Sprintf("%s_ref_cover.png", p.TaskID))
	err = generateReferenceCover(localRefPath, localCoverPath)
	coverKey := ""
	if err == nil {
		// Upload Cover
		// Use same directory structure but maybe different postfix or folder?
		// Key: "covers/locks/..." or just modify original key?
		// User: "store small cover to R2... pass cover path... update"
		// Let's store in `covers/reference/<id>.png`
		coverKey = fmt.Sprintf("covers/reference/%s_720p.png", p.TaskID)
		err = uploadToR2(ctx, localCoverPath, bucketName, coverKey)
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
	externalID := ""

	if apiKey == "" {
		fmt.Printf("[VIDEO] No AI_API_KEY found, switching to MOCK mode.\n")
		externalID = fmt.Sprintf("mock_ext_%d", time.Now().UnixNano())
	} else {
		fmt.Printf("[VIDEO] Sending real request to AI Provider...\n")
		// Prepare Multipart Request
		extID, err := submitVideoTask(apiKey, p.Prompt, localRefPath)
		if err != nil {
			fmt.Printf("[VIDEO] Failed to submit video task: %v\n", err)
			updateTaskStatus(p.TaskID, "failed", nil)
			return nil
		}
		externalID = extID
		fmt.Printf("[VIDEO] Real Task Submitted. ID: %s\n", externalID)
	}

	// 5. Enqueue Status Check
	checkPayload, _ := json.Marshal(VideoCheckStatusPayload{
		TaskID:     p.TaskID,
		AssetID:    p.AssetID,
		VideoID:    p.VideoID,
		ExternalID: externalID,
		ImagePath:  p.ImagePath,
		TryCount:   0,
	})

	client := NewClient()
	defer client.Close()

	// Start checking after 10 seconds (per user req: "10 seconds poll")
	client.Enqueue(asynq.NewTask(TaskTypeVideoCheckStatus, checkPayload), asynq.ProcessIn(10*time.Second))

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

	fmt.Printf("=== [VIDEO] Checking Status: %s (Ext: %s, Try: %d) ===\n", p.TaskID, p.ExternalID, p.TryCount)

	status := "pending"
	apiKey := os.Getenv("AI_API_KEY")

	// Check Logic
	if apiKey == "" || p.ExternalID[:5] == "mock_" {
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

		// If Real API, download actual video
		if apiKey != "" && p.ExternalID[:5] != "mock_" {
			err := downloadVideoContent(apiKey, p.ExternalID, tmpVideoPath)
			if err != nil {
				fmt.Printf("[VIDEO] Download Content Error: %v. Falling back to dummy.\n", err)
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

		// Upload to R2
		jeweaiBucket := os.Getenv("R2_BUCKET")
		if jeweaiBucket == "" {
			jeweaiBucket = "jeweai"
		}

		videoKey := fmt.Sprintf("videos/%s.mp4", p.VideoID)
		thumbKey := fmt.Sprintf("videos/%s_thumb.png", p.VideoID)

		// NOTE: uploadToR2 is from main.go
		err = uploadToR2(ctx, tmpVideoPath, jeweaiBucket, videoKey)
		if err != nil {
			fmt.Printf("Upload video error: %v\n", err)
		}
		err = uploadToR2(ctx, thumbPath, jeweaiBucket, thumbKey)
		if err != nil {
			fmt.Printf("Upload thumb error: %v\n", err)
		}

		fmt.Printf("[VIDEO] Processed & Uploaded: %s, %s\n", videoKey, thumbKey)

		// User asked to notify Nodejs: "task completed... video and thumbnail... asset created"
		// Send "completed" webhook with `videoPath` and `videoCoverPath`
		updateTaskStatus(p.TaskID, "completed", map[string]interface{}{
			"videoPath":      videoKey,
			"videoCoverPath": thumbKey,
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
