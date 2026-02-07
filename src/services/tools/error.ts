import 'dotenv/config';
import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { createTaskCampaign } from "../producers/task.producer.vendas"

export const error = async (nome: string, problema: string) => {

}