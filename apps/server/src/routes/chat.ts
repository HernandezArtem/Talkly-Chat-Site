import { Hono } from "hono";
import { handleChatRequest } from "../lib/chat/service";

export const chatRoute = new Hono();

chatRoute.post("/", handleChatRequest);
