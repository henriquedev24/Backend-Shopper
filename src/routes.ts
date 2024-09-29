import express from "express";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

const API_KEY = process.env.GEMINI_API_KEY || "";

app.use((req, res) => {

});

// Rota de consulta ao Gemini
app.post("/upload", async (req, res) => {
  try {
    const { image, customer_code, measure_datetime, measure_type } = req.body;

    // Validação dos parâmetros
    if (!image || !customer_code || !measure_datetime || !measure_type) {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description: "Os dados enviados estão incompletos ou inválidos.",
      });
    }

    // Verificação de leituras existentes para o mesmo mês
    const existingReading = await prisma.leituraResposta.findFirst({
      where: {
        customer_code,
        measure_type,
      },
    });

    if (existingReading) {
      return res.status(409).json({
        error_code: "DOUBLE_REPORT",
        error_description: "Leitura do mês já foi realizada.",
      });
    }

    // Integração com a Google Generative AI
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt =
      "Necessário o número de leitura do hidrante e a URL da imagem enviada, separados com espaços.";
    const imageParam = {
      inlineData: {
        data: image,
        mimeType: "image/png",
      },
    };

    const result = await model.generateContent([prompt, imageParam]);
    const resposta = result.response.text();

    // Criando a leitura no banco de dados
    const createLeituraResposta = {
      measure_uuid: uuidv4(),
      customer_code,
      resposta: Number(resposta.split(" ")[0]),
      measure_type,
      measure_datetime: new Date(measure_datetime),
      imageURL: resposta.split(" ")[1],
    };

    await prisma.leituraResposta.create({
      data: createLeituraResposta,
    });

    return res.json({
      image_url: createLeituraResposta.imageURL,
      measure_uuid: createLeituraResposta.measure_uuid,
      resposta: createLeituraResposta.resposta,
    });
  } catch (error) {
    console.error("Erro ao processar upload:", error);
    return res.status(500).json({
      error_code: "INTERNAL_SERVER_ERROR",
      error_description: "Ocorreu um erro no servidor.",
    });
  }
});

// Rota de confirmação de leitura
app.patch("/confirm", async (req, res) => {
  try {
    const { measure_uuid, confirmed_value } = req.body;

    if (!measure_uuid || confirmed_value !== "number") {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description: "UUID e valor confirmado são necessários.",
      });
    }

    const existingReading = await prisma.leituraResposta.findUnique({
      where: { measure_uuid },
    });

    if (!existingReading) {
      return res.status(404).json({
        error_code: "MEASURE_NOT_FOUND",
        error_description: "Leitura não encontrada.",
      });
    }

    if (existingReading.confirmed_value === confirmed_value) {
      return res.status(409).json({
        error_code: "CONFIRMATION_DUPLICATE",
        error_description: "Este valor já foi confirmado anteriormente.",
      });
    }

    await prisma.leituraResposta.update({
      where: { measure_uuid },
      data: { confirmed_value },
    });

    return res.status(200).json({ message: "Leitura confirmada com sucesso." });
  } catch (error) {
    console.error("Erro ao confirmar leitura:", error);
    return res.status(500).json({
      error_code: "INTERNAL_SERVER_ERROR",
      error_description: "Ocorreu um erro no servidor.",
    });
  }
});

// Rota para listar leituras de um cliente
app.get("/:customer_code/list", async (req, res) => {
  try {
    const { customer_code } = req.params;
    const { measure_type } = req.query;

    if (!customer_code || (measure_type !== "WATER" && measure_type !== "GAS")) {
      return res.status(400).json({
        error_code: "INVALID_DATA",
        error_description: "Código do cliente ou tipo de medição inválidos.",
      });
    }

    const readings = await prisma.leituraResposta.findMany({
      where: {
        customer_code,
        measure_type,
      },
    });

    if (readings.length === 0) {
      return res.status(404).json({
        error_code: "MEASURES_NOT_FOUND",
        error_description: "Nenhuma leitura encontrada para este cliente.",
      });
    }

    return res.status(200).json(readings);
  } catch (error) {
    console.error("Erro ao listar leituras:", error);
    return res.status(500).json({
      error_code: "INTERNAL_SERVER_ERROR",
      error_description: "Ocorreu um erro no servidor.",
    });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

async function testConnection() {
  try {
    await prisma.$connect();
    console.log("Conexão com o banco de dados estabelecida com sucesso!");
  } catch (error) {
    console.error("Erro ao conectar ao banco de dados:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();