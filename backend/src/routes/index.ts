import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import universitiesRouter from "./universities";
import majorsRouter from "./majors";
import scoreRouter from "./score";
import chatRouter from "./chat";
import newsRouter from "./news";
import usersRouter from "./users";
import chatbotRouter from "./chatbot";
import admissionGuidesRouter from "./admission-guides";
import knowledgeBaseRouter from "./knowledge-base";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(universitiesRouter);
router.use(majorsRouter);
router.use(scoreRouter);
router.use(chatRouter);
router.use(newsRouter);
router.use(usersRouter);
router.use(chatbotRouter);
router.use(admissionGuidesRouter);
router.use(knowledgeBaseRouter);

export default router;
