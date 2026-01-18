import { me, testFile } from "../services/user";
import { generateVideo, checkStatus, generateImage } from "../services/assets";
import * as task from "../services/task";
import {
  get as getAsset,
  list as listAssets,
  update as updateAsset,
  deleteAsset,
  copy as copyAsset,
  createFolder,
  updateFolder,
  deleteFolder,
  listFolders,
  getFolder,
} from "../services/asset";
import * as auth from "../services/auth";

export const router = {
  auth,
  user: {
    me: me,
    testFile: testFile,
  },
  assets: {
    generateVideo,
    generateImage,
    checkStatus,
    get: getAsset,
    list: listAssets,
    update: updateAsset,
    delete: deleteAsset,
    copy: copyAsset,
    createFolder,
    updateFolder,
    deleteFolder,
    listFolders,
    getFolder,
  },
  task,
};

export type Router = typeof router;

