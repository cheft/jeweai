package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	cloudflare "github.com/cloudflare/cloudflare-go/v6"
	"github.com/cloudflare/cloudflare-go/v6/option"
	"github.com/cloudflare/cloudflare-go/v6/r2"
	"github.com/gofiber/fiber/v2"
	"github.com/hibiken/asynq"
)

// --------------- 异步任务生产者 ---------------
func NewClient() *asynq.Client {
	return asynq.NewClient(asynq.RedisClientOpt{
		Addr:     "127.0.0.1:6379",
		Password: "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
		DB:       1,
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

	// 2. 初始化 Fiber Web 服务器
	app := fiber.New()
	client := NewClient()
	defer client.Close()

	// 2.1 路由：添加图片任务
	app.Post("/queue/addImage", func(c *fiber.Ctx) error {
		var payload ImageGeneratePayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
		}

		taskID := fmt.Sprintf("task_%d", time.Now().UnixNano())
		payload.TaskID = taskID

		imgPayload, _ := json.Marshal(payload)
		taskImg := asynq.NewTask(TaskTypeImageGenerate, imgPayload, asynq.Timeout(60*time.Second), asynq.TaskID(taskID))
		_, err := client.Enqueue(taskImg, asynq.Queue("media"))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Enqueue error (Image): %v", err)})
		}

		return c.JSON(fiber.Map{"taskId": taskID})
	})

	// 2.2 路由：添加视频任务
	app.Post("/queue/addVideo", func(c *fiber.Ctx) error {
		var payload VideoGeneratePayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
		}

		taskID := fmt.Sprintf("task_%d", time.Now().UnixNano())
		payload.TaskID = taskID

		videoID := fmt.Sprintf("vid_%d", time.Now().Unix())
		payload.VideoID = videoID

		genPayload, _ := json.Marshal(payload)
		taskGen := asynq.NewTask(TaskTypeVideoGenerate, genPayload, asynq.Timeout(30*time.Second), asynq.TaskID(taskID))
		_, err := client.Enqueue(taskGen, asynq.Queue("media"))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Enqueue error (Video Gen): %v", err)})
		}

		// 2.3 入队状态检查任务 (延迟 5 秒)
		checkPayload, _ := json.Marshal(VideoCheckStatusPayload{
			TaskID:  taskID,
			VideoID: videoID,
		})
		taskCheck := asynq.NewTask(TaskTypeVideoCheckStatus, checkPayload, asynq.Timeout(300*time.Second))
		if _, err := client.Enqueue(taskCheck, asynq.Queue("media"), asynq.ProcessIn(5*time.Second)); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Enqueue error (Video Check): %v", err)})
		}

		return c.JSON(fiber.Map{"taskId": taskID, "videoId": videoID})
	})

	// 2.3 路由：测试上传文件到 R2
	app.Get("/test/uploadFile", func(c *fiber.Ctx) error {
		filePath := "./sync_test.jpg"
		// 检查文件是否存在
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			return c.Status(404).SendString(fmt.Sprintf("File not found: %s", filePath))
		}

		ctx := context.TODO()
		bucketName := os.Getenv("R2_BUCKET")
		if bucketName == "" {
			bucketName = "covers" // Default or placeholder
		}
		objectKey := fmt.Sprintf("userid123456/%d_sync_test.jpg", time.Now().Unix())

		err := uploadToR2(ctx, filePath, bucketName, objectKey)
		if err != nil {
			return c.Status(500).SendString(fmt.Sprintf("Upload failed: %v", err))
		}

		return c.SendString(fmt.Sprintf("File uploaded successfully to R2 bucket %s as %s", bucketName, objectKey))
	})

	fmt.Printf("=== [SYSTEM] Web server starting on :3000... ===\n")
	if err := app.Listen(":3000"); err != nil {
		fmt.Printf("Fiber error: %v\n", err)
	}
}

// uploadToR2 使用 cloudflare-go v6.5.0 和 AWS SDK V2 上传文件到 Cloudflare R2
// cloudflare-go 用于管理和验证，AWS SDK 用于实际文件上传（S3 兼容 API）
func uploadToR2(ctx context.Context, filePath, bucketName, objectKey string) error {

	accountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	accessKeyID := os.Getenv("R2_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	r2Token := os.Getenv("CLOUDFLARE_R2_TOKEN")

	if accountID == "" || accessKeyID == "" || secretAccessKey == "" {
		return fmt.Errorf("missing R2 credentials (CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)")
	}

	// 可选：使用 cloudflare-go SDK 验证 bucket 是否存在
	if r2Token != "" {
		cfClient := cloudflare.NewClient(option.WithAPIToken(r2Token))
		_, err := cfClient.R2.Buckets.Get(ctx, bucketName, r2.BucketGetParams{
			AccountID: cloudflare.F(accountID),
		})
		if err != nil {
			fmt.Printf("Warning: Could not verify bucket with cloudflare-go: %v\n", err)
			// 继续执行，因为 bucket 可能存在但 token 权限不足
		}
	}

	// 使用 AWS SDK V2 上传文件（S3 兼容 API）- 最新写法
	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("auto"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
	)
	if err != nil {
		return fmt.Errorf("failed to load SDK config: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(r2Endpoint)
	})

	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %v", err)
	}
	defer file.Close()

	fmt.Printf("Uploading %s to R2 bucket %s as %s...\n", filePath, bucketName, objectKey)

	// 根据文件扩展名设置 Content-Type
	contentType := "application/octet-stream" // 默认值
	if len(objectKey) > 4 {
		ext := objectKey[len(objectKey)-4:]
		switch ext {
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".png":
			contentType = "image/png"
		case ".gif":
			contentType = "image/gif"
		case ".webp":
			contentType = "image/webp"
		}
	}

	_, err = client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucketName),
		Key:         aws.String(objectKey),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return fmt.Errorf("failed to upload object: %v", err)
	}

	fmt.Printf("Successfully uploaded to R2: %s\n", objectKey)
	return nil
}
