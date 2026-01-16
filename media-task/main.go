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
	"github.com/gofiber/fiber/v2"
	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
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
	// 0. 加载 .env 变量
	if err := godotenv.Load(); err != nil {
		fmt.Printf("Warning: .env file not found or error loading it: %v\n", err)
	}

	// 1. 初始化 Redis 消费者
	srv := NewServer()
	mux := asynq.NewServeMux()
	mux.HandleFunc(TaskTypeImageGenerate, HandleImageGenerateTask)
	mux.HandleFunc(TaskTypeImageCheckStatus, HandleImageCheckStatusTask)
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
		taskImg := asynq.NewTask(TaskTypeImageGenerate, imgPayload, asynq.Timeout(600*time.Second), asynq.TaskID(taskID)) // 10 minutes timeout for sync image generation
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

		// Note: We do NOT enqueue VideoCheckStatus here.
		// The VideoGenerate task (HandleVideoGenerateTask) will enqueue the first status check
		// once it has successfully submitted to the AI provider and obtained an ExternalID.

		return c.JSON(fiber.Map{"taskId": taskID, "videoId": videoID})
	})

	fmt.Printf("=== [SYSTEM] Web server starting on :3000... ===\n")
	if err := app.Listen(":3000"); err != nil {
		fmt.Printf("Fiber error: %v\n", err)
	}
}

// getS3Client 初始化并返回 AWS S3 客户端（R2 兼容）
func getS3Client(ctx context.Context) (*s3.Client, error) {
	accountID := os.Getenv("CLOUDFLARE_ACCOUNT_ID")
	accessKeyID := os.Getenv("R2_ACCESS_KEY_ID")
	secretAccessKey := os.Getenv("R2_SECRET_ACCESS_KEY")

	// fmt.Printf("=== [SYSTEM] R2 credentials: %s %s %s ===\n", accountID, accessKeyID, secretAccessKey)
	if accountID == "" || accessKeyID == "" || secretAccessKey == "" {
		return nil, fmt.Errorf("missing R2 credentials")
	}

	r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("auto"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, "")),
	)
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(r2Endpoint)
	})

	return client, nil
}

// moveR2Object 将对象从一个桶移动到另一个桶
func moveR2Object(ctx context.Context, srcBucket, srcKey, destBucket, destKey string) error {
	client, err := getS3Client(ctx)
	if err != nil {
		return err
	}

	copySource := fmt.Sprintf("%s/%s", srcBucket, srcKey)
	fmt.Printf("Moving %s to %s/%s...\n", copySource, destBucket, destKey)

	// 1. Copy Object
	_, err = client.CopyObject(ctx, &s3.CopyObjectInput{
		Bucket:     aws.String(destBucket),
		Key:        aws.String(destKey),
		CopySource: aws.String(copySource),
	})
	if err != nil {
		return fmt.Errorf("failed to copy object: %v", err)
	}

	// 2. Delete Original Object
	_, err = client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(srcBucket),
		Key:    aws.String(srcKey),
	})
	if err != nil {
		return fmt.Errorf("failed to delete original object: %v", err)
	}

	fmt.Printf("Successfully moved %s to %s/%s\n", srcKey, destBucket, destKey)
	return nil
}

// uploadToR2 使用 AWS SDK V2 上传文件到 Cloudflare R2
func uploadToR2(ctx context.Context, filePath, bucketName, objectKey string) error {
	client, err := getS3Client(ctx)
	if err != nil {
		return err
	}

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
