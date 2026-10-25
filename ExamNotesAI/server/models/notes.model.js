import mongoose from "mongoose";
const notesSchema =  new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserModel",
        required: true
    },

    topic: {
        type: String,
        required: true
    },

    classLevel: String,
    examType: String,

    revisionMode: {
        type: Boolean,
        default: false
    },

    includeDiagram: Boolean,
    includeChart: Boolean,
    hasSource: {
        type: Boolean,
        default: false
    },

    content: {
        type: mongoose.Schema.Types.Mixed, // AI response (string / JSON)
        required: true
    },

    extras: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    quizAttempts: [{
        score: Number,
        total: Number,
        wrongTopics: [String],
        takenAt: Date
    }]
},{timestamps:true})

const Notes = mongoose.model("Notes", notesSchema)

export default Notes