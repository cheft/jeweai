import Redis from 'ioredis';
import { REDIS_URL } from '$env/static/private';

// Default to the credentials used in Go worker if not provided
// Addr: "127.0.0.1:6379", Password: "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81", DB: 1
const defaultUrl = 'redis://:eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81@127.0.0.1:6379/1';

const connectionString = REDIS_URL || defaultUrl;

const redis = new Redis(connectionString);

export default redis;
