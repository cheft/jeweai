package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
)

// --------------- 异步任务生产者 ---------------
func NewClient() *asynq.Client {
	return asynq.NewClient(asynq.RedisClientOpt{
		Addr:     "127.0.0.1:6379",
		Password: "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
	})
}

func main() {
	// 1. 初始化 Redis 消费者
	srv := NewServer()
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskTypeImageGenerate, HandleImageGenerateTask)
	mux.HandleFunc(TaskTypeVideoGenerate, HandleVideoGenerateTask)
	mux.HandleFunc(TaskTypeVideoCheckStatus, HandleVideoCheckStatusTask)

	go func() {
		if err := srv.Run(mux); err != nil {
			fmt.Printf("Server error: %v\n", err)
		}
	}()

	// 2. 异步任务入队
	client := NewClient()
	defer client.Close()

	// 2.1 入队图片生成任务
	imgPayload, _ := json.Marshal(ImageGeneratePayload{
		ImagePath: "./sync_test.jpg",
		Width:     1920,
		Height:    1080,
		ImgName:   "4K_Jewelry_Render",
	})
	taskImg := asynq.NewTask(TaskTypeImageGenerate, imgPayload, asynq.Timeout(60*time.Second))
	if _, err := client.Enqueue(taskImg, asynq.Queue("media")); err != nil {
		fmt.Printf("Enqueue error (Image): %v\n", err)
	}

	// 2.2 入队视频生成任务
	videoID := fmt.Sprintf("vid_%d", time.Now().Unix())
	genPayload, _ := json.Marshal(VideoGeneratePayload{
		VideoID: videoID,
		Prompt:  "Professional jewelry commercial, cinematic lighting",
	})
	taskGen := asynq.NewTask(TaskTypeVideoGenerate, genPayload, asynq.Timeout(30*time.Second))
	if _, err := client.Enqueue(taskGen, asynq.Queue("media")); err != nil {
		fmt.Printf("Enqueue error (Video Gen): %v\n", err)
	}

	// 2.3 入队状态检查任务 (延迟 5 秒)
	checkPayload, _ := json.Marshal(VideoCheckStatusPayload{
		VideoID: videoID,
	})
	taskCheck := asynq.NewTask(TaskTypeVideoCheckStatus, checkPayload, asynq.Timeout(300*time.Second))
	if _, err := client.Enqueue(taskCheck, asynq.Queue("media"), asynq.ProcessIn(5*time.Second)); err != nil {
		fmt.Printf("Enqueue error (Video Check): %v\n", err)
	}

	fmt.Printf("=== [SYSTEM] All tasks enqueued. Workers are processing... ===\n")
	fmt.Printf("=== [SYSTEM] Press Ctrl+C to exit. ===\n")

	// 保持运行以观察输出
	select {}
}
