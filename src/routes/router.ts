import { me, testFile } from "../services/user";
import { generateVideo, checkStatus, generateImage } from "../services/assets";

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
};

export type Router = typeof router;
