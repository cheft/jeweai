package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/hibiken/asynq"
)

// Helper to update task status in SvelteKit
func updateTaskStatus(taskId string, status string, resultUrl string, thumbnailUrl string) {
	url := "http://localhost:5173/api/task/update"
	payload := map[string]string{
		"taskId":       taskId,
		"status":       status,
		"resultUrl":    resultUrl,
		"thumbnailUrl": thumbnailUrl,
	}
	jsonData, _ := json.Marshal(payload)

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Printf("[Webhook Error] Failed to update status: %v\n", err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("[Webhook] Status updated to %s for task %s (Response: %d)\n", status, taskId, resp.StatusCode)
}

// 定义任务类型常量
const (
	// 图片任务：生成图片
	TaskTypeImageGenerate = "image:generate"
	// 视频任务1：开始生成
	TaskTypeVideoGenerate = "video:generate"
	// 视频任务2：检查状态
	TaskTypeVideoCheckStatus = "video:check_status"
)

// --------------- 任务有效载荷 ---------------
// ImageGeneratePayload 图片生成任务参数
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

// VideoGeneratePayload 视频生成任务参数
type VideoGeneratePayload struct {
	TaskID    string `json:"TaskID"`
	AssetID   string `json:"AssetID"`
	VideoID   string `json:"VideoID"`
	Prompt    string `json:"Prompt"`
	ImagePath string `json:"ImagePath"`
	StyleID   string `json:"StyleID"`
}

// VideoCheckStatusPayload 视频状态检查任务参数
type VideoCheckStatusPayload struct {
	TaskID    string `json:"TaskID"`
	AssetID   string `json:"AssetID"`
	VideoID   string `json:"VideoID"`
	ImagePath string `json:"ImagePath"`
}

// --------------- 消费者：处理任务 ---------------
// NewServer 创建 Asynq Server 实例
func NewServer() *asynq.Server {
	redisClient := asynq.RedisClientOpt{
		Addr:     "127.0.0.1:6379",
		Password: "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
		DB:       1,
	}

	// 创建 Server
	srv := asynq.NewServer(redisClient, asynq.Config{
		Concurrency: 2,
		Queues: map[string]int{
			"media": 10,
		},
	})

	return srv
}

// HandleImageGenerateTask 处理图片生成任务
func HandleImageGenerateTask(ctx context.Context, t *asynq.Task) error {
	var p ImageGeneratePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("\n=== [IMAGE] Processing: %s (Asset: %s) ===\n", p.TaskID, p.AssetID)
	fmt.Printf("[IMAGE] ImagePath: %s\n", p.ImagePath)

	coversBucket := os.Getenv("R2_PUBLIC_BUCKET") // Assume this is the covers bucket
	jeweaiBucket := os.Getenv("R2_BUCKET")
	if jeweaiBucket == "" {
		jeweaiBucket = "jeweai" // Fallback
	}

	// 1. Simulate Thumbnail Generation in covers bucket
	// Original is at: locks/userId/id_file.png
	// Thumbnail should be at: userId/id_file.png (in covers bucket)
	thumbnailPath := ""
	if p.ImagePath != "" {
		// Replace "locks/" with "" to get thumbnail path
		thumbnailPath = fmt.Sprintf("%s", p.ImagePath[6:]) // Skip "locks/"
		fmt.Printf("Simulating Thumbnail: %s\n", thumbnailPath)

		// In a real scenario, we'd generate and upload. Here we just notify.
		updateTaskStatus(p.TaskID, "execute", "", thumbnailPath)
	} else {
		updateTaskStatus(p.TaskID, "execute", "", "")
	}

	// 模拟处理耗时 (5秒)
	time.Sleep(5 * time.Second)

	// 2. On Completion: Move original from covers/locks/ to jeweai/
	if p.ImagePath != "" && jeweaiBucket != "" {
		destKey := p.ImagePath[6:] // Skip "locks/"
		err := moveR2Object(ctx, coversBucket, p.ImagePath, jeweaiBucket, destKey)
		if err != nil {
			fmt.Printf("Move error: %v\n", err)
			// We might not want to fail the whole task if move fails, but user wants it moved.
		}

		finalUrl := destKey // Using the key as the "url" for now, Node.js will handle mapping if needed
		updateTaskStatus(p.TaskID, "complete", finalUrl, thumbnailPath)
	} else {
		updateTaskStatus(p.TaskID, "complete", "result_mock_url", "")
	}

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
	fmt.Printf("[VIDEO] ImagePath: %s\n", p.ImagePath)

	// Simulate Thumbnail/Cover generation in covers bucket
	thumbnailPath := ""
	if p.ImagePath != "" {
		thumbnailPath = p.ImagePath[6:] // Skip "locks/"
		updateTaskStatus(p.TaskID, "execute", "", thumbnailPath)
	} else {
		updateTaskStatus(p.TaskID, "execute", "", "")
	}

	// 模拟请求外部 API 的耗时
	time.Sleep(2 * time.Second)

	fmt.Printf("=== [VIDEO] Request sent to AI Provider. UUID: %s ===\n\n", p.VideoID)
	return nil
}

// HandleVideoCheckStatusTask 处理视频状态检查任务
func HandleVideoCheckStatusTask(ctx context.Context, t *asynq.Task) error {
	var p VideoCheckStatusPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("=== [VIDEO] Checking Status: %s (Asset: %s) ===\n", p.TaskID, p.AssetID)
	fmt.Printf("[VIDEO] ImagePath: %s\n", p.ImagePath)

	// 模拟检查逻辑
	time.Sleep(10 * time.Second)

	// 1. Completion logic
	jeweaiBucket := os.Getenv("R2_BUCKET")
	if jeweaiBucket == "" {
		jeweaiBucket = "jeweai"
	}
	coversBucket := os.Getenv("R2_PUBLIC_BUCKET")

	// Update 2024-01-04: Video assets also have Path (thumbnail)
	videoResultUrl := fmt.Sprintf("videos/%s.mp4", p.VideoID)
	videoThumbUrl := fmt.Sprintf("videos/%s_thumb.png", p.VideoID)

	if p.ImagePath != "" {
		movedPath := p.ImagePath[6:] // Skip "locks/"
		fmt.Printf("[VIDEO] Moving reference image: %s -> %s\n", p.ImagePath, movedPath)

		// Move reference image to permanent storage (jeweai)
		err := moveR2Object(ctx, coversBucket, p.ImagePath, jeweaiBucket, movedPath)
		if err != nil {
			fmt.Printf("[VIDEO] Move reference image error: %v\n", err)
		}
	}

	// Notify complete: resultUrl is the video, thumbnailUrl is the video's thumbnail
	updateTaskStatus(p.TaskID, "complete", videoResultUrl, videoThumbUrl)

	fmt.Printf("=== [VIDEO] Status: COMPLETED. URL: %s ===\n\n", videoResultUrl)
	return nil
}
