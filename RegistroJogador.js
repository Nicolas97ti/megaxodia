import mongoose from "mongoose";

const RegistroJogadorSchema = new mongoose.Schema({

    name: String,
    top: Number,
    jg: Number,
    mid: Number,
    adc: Number,
    sup: Number,
});

export default mongoose.model("Jogador", RegistroJogadorSchema);