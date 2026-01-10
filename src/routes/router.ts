import { me, testFile } from "../services/user";
import { generateVideo, checkStatus, generateImage } from "../services/assets";
import * as task from "../services/task";
import { get as getAsset } from "../services/asset";

export const router = {
  user: {
    me: me,
    testFile: testFile,
  },
  assets: {
    generateVideo,
    generateImage,
    checkStatus,
    get: getAsset,
  },
  task,
};

export type Router = typeof router;

