import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import RegistroJogador from "./RegistroJogador.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permite requisições do frontend (GitHub Pages)
app.use(express.json());

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Conectado ao MongoDB");
    } catch (error) {
        console.log("Erro ao conectar MongoDB:", error);
    }
}

connectDB();

// ========== ROTAS DA API ==========

// CREATE
app.post("/jogador", async (req, res) => {
    try {
        const novoJogador = await RegistroJogador.create(req.body);
        res.status(201).json(novoJogador);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// READ - Buscar todos
app.get("/jogador", async (req, res) => {
    try {
        const jogadores = await RegistroJogador.find();
        res.json(jogadores);
    } catch (error) {
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
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Servidor API rodando na porta ${PORT}`));