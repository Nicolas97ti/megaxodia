import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import RegistroJogador from "./RegistroJogador.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configurado
app.use(cors({
    origin: ['https://nicolas97ti.github.io', 'http://localhost:3000', 'http://localhost:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuração do MongoDB com timeout maior
const connectDB = async () => {
    try {
        // Configurar timeout da conexão
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000, // 30 segundos para seleção do servidor
            socketTimeoutMS: 45000, // 45 segundos para operações
            connectTimeoutMS: 30000 // 30 segundos para conexão
        });
        console.log("Conectado ao MongoDB");
    } catch (error) {
        console.log("Erro ao conectar MongoDB:", error.message);
        // Tentar novamente após 5 segundos
        setTimeout(connectDB, 5000);
    }
}

connectDB();

// Rota de teste
app.get("/", (req, res) => {
    res.json({ message: "API Megaxodia está funcionando!" });
});

// CREATE
app.post("/jogador", async (req, res) => {
    try {
        const novoJogador = await RegistroJogador.create(req.body);
        res.status(201).json(novoJogador);
    } catch (error) {
        console.error("Erro ao criar jogador:", error);
        res.status(500).json({ error: error.message });
    }
});

// READ - Buscar todos (com timeout configurado)
app.get("/jogador", async (req, res) => {
    try {
        // Definir timeout para a query
        const jogadores = await RegistroJogador.find().maxTimeMS(30000);
        res.json(jogadores);
    } catch (error) {
        console.error("Erro ao buscar jogadores:", error);
        res.status(500).json({ error: error.message });
    }
});

// READ - Buscar um
app.get("/jogador/:id", async (req, res) => {
    try {
        const jogador = await RegistroJogador.findById(req.params.id);
        if (!jogador) return res.status(404).json({ error: "Jogador não encontrado" });
        res.json(jogador);
    } catch (error) {
        console.error("Erro ao buscar jogador:", error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE
app.put("/jogador/:id", async (req, res) => {
    try {
        const { name, top, jg, mid, adc, sup } = req.body;
        const jogadorAtualizado = await RegistroJogador.findByIdAndUpdate(
            req.params.id,
            { name, top, jg, mid, adc, sup },
            { new: true, runValidators: true }
        );
        if (!jogadorAtualizado) return res.status(404).json({ error: "Jogador não encontrado" });
        res.json(jogadorAtualizado);
    } catch (error) {
        console.error("Erro ao atualizar jogador:", error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE
app.delete("/jogador/:id", async (req, res) => {
    try {
        const jogadorDeletado = await RegistroJogador.findByIdAndDelete(req.params.id);
        if (!jogadorDeletado) return res.status(404).json({ error: "Jogador não encontrado" });
        res.json(jogadorDeletado);
    } catch (error) {
        console.error("Erro ao deletar jogador:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`?? Servidor rodando na porta ${PORT}`));