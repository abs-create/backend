const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const csv = require("csv-parser");

const app = express();
const port = 3000;
const uri = "mongodb://localhost:27017"; // MongoDB local connection

// Middleware
app.use(cors()); // 
app.use(express.json()); // To parse incoming JSON requests

// MongoDB Setup
let lessonsCollection;

async function connectMongo() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("afterschool");
    lessonsCollection = db.collection("activities");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

connectMongo();

// Load CSV data and insert into MongoDB
// It is connected to MongoDB Compass
function loadCsvData() {
  const lessons = [];
  fs.createReadStream("lessons.csv")  // Path to your CSV file
    .pipe(csv())
    .on("data", (row) => {
      lessons.push({
        topic: row.topic,
        price: parseInt(row.price),
        location: row.location,
        space: parseInt(row.space),
      });
    })
    .on("end", async () => {
      try {
        // Insert data into MongoDB, to make sure there is no duplicate topics for same location
        for (let lesson of lessons) {
          const existingLesson = await lessonsCollection.findOne({
            topic: lesson.topic,
            location: lesson.location
          });

          if (!existingLesson) {
            await lessonsCollection.insertOne(lesson);
          }
        }
        console.log("CSV data inserted successfully");
      } catch (error) {
        console.error("Error inserting CSV data:", error);
      }
    });
}

loadCsvData();

// Get all lessons
app.get("/activities", async (req, res) => {
  try {
    const lessons = await lessonsCollection.find().toArray();
    // Removeing duplicates
    const uniqueLessons = Array.from(new Set(lessons.map(a => a.topic)))
      .map(topic => lessons.find(a => a.topic === topic));

    res.json(uniqueLessons);
  } catch (error) {
    res.status(500).json({ message: "Error fetching lessons" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
