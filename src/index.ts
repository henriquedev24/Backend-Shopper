import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const router = Router();
const API_KEY = process.env.GEMINI_API_KEY || "";
router.post("/upload", async (res, req) => {
	const { image, customer_code, measure_datetime, measure_type } = req.body;
    // Validando os parâmetros
	if (image && customer_code && measure_datetime && measure_type) {
		const leituraMes = await prisma.leituraResposta.findMany({
			where: {
				customer_code: customer_code,
				measure_type: measure_type,
			},
		});
        // Verificando se existe uma leitura do mês
		if (leituraMes.length > 0) {
			res.status(409).json({
				error_code: "DOUBLE_REPORT",
				error_description: "Leitura do mês já realizada",
			});
		} else {
            // Fazendo a consulta na AI
			const genAI = new GoogleGenerativeAI(API_KEY || "");
			const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
			const prompt =
				"Necessário o número de leitura do hidrante e a url da imagem enviada, separados com espaços";
			const result = await model.generateContent(prompt);
			console.log(result.response.text());
		}
	}
});
