package main

import (
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"time"

	"github.com/hibiken/asynq"
)

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
	ImagePath string
	Width     int
	Height    int
	ImgName   string
	Prompt    string
	StyleID   string
}

// VideoGeneratePayload 视频生成任务参数
type VideoGeneratePayload struct {
	VideoID   string
	Prompt    string
	ImagePath string
	StyleID   string
}

// VideoCheckStatusPayload 视频状态检查任务参数
type VideoCheckStatusPayload struct {
	VideoID string
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

	fmt.Printf("\n=== [ASYNCHRONOUS] Starting Image Generation ===\n")
	fmt.Printf("Path: %s, Name: %s\n", p.ImagePath, p.ImgName)

	img := image.NewRGBA(image.Rect(0, 0, p.Width, p.Height))

	// 浅蓝色背景
	blue := color.RGBA{R: 135, G: 206, B: 235, A: 255}
	for y := 0; y < p.Height; y++ {
		for x := 0; x < p.Width; x++ {
			img.Set(x, y, blue)
		}
	}

	file, err := os.Create(p.ImagePath)
	if err != nil {
		return err
	}
	defer file.Close()

	if err := jpeg.Encode(file, img, &jpeg.Options{Quality: 90}); err != nil {
		return err
	}

	// 模拟处理耗时 (40秒)
	time.Sleep(40 * time.Second)
	fmt.Printf("=== [ASYNCHRONOUS] Image Generation COMPLETED ===\n\n")
	return nil
}

// HandleVideoGenerateTask 处理视频生成任务
func HandleVideoGenerateTask(ctx context.Context, t *asynq.Task) error {
	var p VideoGeneratePayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("=== [ASYNCHRONOUS] Starting Video Generation ===\n")
	fmt.Printf("Video ID: %s\n", p.VideoID)
	fmt.Printf("Prompt:   %s\n", p.Prompt)

	// 模拟请求外部 API 的耗时
	time.Sleep(2 * time.Second)

	fmt.Printf("=== [ASYNCHRONOUS] Request sent to AI Provider. UUID: %s ===\n\n", p.VideoID)
	return nil
}

// HandleVideoCheckStatusTask 处理视频状态检查任务
func HandleVideoCheckStatusTask(ctx context.Context, t *asynq.Task) error {
	var p VideoCheckStatusPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("marshal error: %v", err)
	}

	fmt.Printf("=== [ASYNCHRONOUS] Checking Video Status ===\n")
	fmt.Printf("Video ID: %s\n", p.VideoID)

	// 模拟检查逻辑 (240秒)
	time.Sleep(240 * time.Second)
	fmt.Printf("=== [ASYNCHRONOUS] Status: COMPLETED. URL: https://r2.example.com/videos/%s.mp4 ===\n\n", p.VideoID)
	return nil
}
