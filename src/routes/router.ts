import { me, testFile } from "../services/user";
import { generateVideo, checkStatus } from "../services/assets";

export const router = {
  user: {
    me: me,
    testFile: testFile,
  },
  assets: {
    generateVideo,
    checkStatus,
  },
};

export type Router = typeof router;
