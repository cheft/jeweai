import { me, testFile } from "../services/user";
import { generateVideo, checkStatus, generateImage } from "../services/assets";
import * as task from "../services/task";

export const router = {
  user: {
    me: me,
    testFile: testFile,
  },
  assets: {
    generateVideo,
    generateImage,
    checkStatus,
  },
  task,
};

export type Router = typeof router;
