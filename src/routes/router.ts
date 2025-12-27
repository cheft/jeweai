import { me, testFile } from "../services/user";

export const router = {
  user: {
    me: me,
    testFile: testFile,
  },
};

export type Router = typeof router;
