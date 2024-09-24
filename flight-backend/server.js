const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Bağlantısı
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB bağlantısı başarılı"))
  .catch((err) => console.error("MongoDB bağlantı hatası:", err));

// Uçuş Modeli
const flightSchema = new mongoose.Schema({
  flightNumber: String,
  departureTime: String,
  arrivalTime: String,
  from: String,
  to: String,
  status: String, // Uçuş durumunu ekledik
});

const Flight = mongoose.model("Flight", flightSchema);

// Schiphol API'den uçuş bilgilerini alıp MongoDB'ye kaydetme
app.get("/api/flights", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.schiphol.nl/public-flights/flights",
      {
        headers: {
          ResourceVersion: "v4",
          app_id: process.env.API_ID,
          app_key: process.env.API_KEY,
        },
      }
    );

    const flights = response.data.flights;

    // Schiphol API'den gelen uçuş verilerini MongoDB'ye kaydetme
    const flightPromises = flights.map(async (flightData) => {
      const origin = flightData.route.destinations[0]; // İlk destinasyonu al
      const destination = flightData.route.destinations[1]; // İkinci destinasyonu al

      const flight = new Flight({
        flightNumber: flightData.flightNumber.toString(), // Sayıyı string'e çevir
        departureTime: flightData.scheduleDateTime,
        arrivalTime:
          flightData.estimatedLandingTime || flightData.actualLandingTime, // Varış zamanını belirle
        from: origin, // Uçuşun kalkış yeri
        to: destination, // Uçuşun varış yeri
        status: flightData.publicFlightState.flightStates[0] || "Bilinmiyor", // Uçuş durumunu al
      });

      return flight.save(); // Kaydetme işlemini döndür
    });

    await Promise.all(flightPromises); // Tüm kayıt işlemlerini bekle
    res.json(flights); // API'den gelen verileri frontend'e gönderme
  } catch (error) {
    console.error("API Hatası:", error.message);
    res
      .status(500)
      .json({ message: "Uçuş verileri alınamadı", error: error.message });
  }
});

// Kullanıcının MongoDB'deki tüm uçuşlarını listeleme
app.get("/api/my-flights", async (req, res) => {
  try {
    const flights = await Flight.find(); // Tüm uçuşları MongoDB'den çek
    res.json(flights); // JSON olarak geri döndür
  } catch (error) {
    console.error("Sunucu hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Kullanıcının seçtiği uçuşu MongoDB'ye kaydet
app.post("/api/flights", async (req, res) => {
  const flight = new Flight(req.body);
  try {
    await flight.save();
    res.status(201).json({ message: "Uçuş başarıyla kaydedildi" });
  } catch (error) {
    console.error("Uçuş kaydedilirken hata:", error);
    res.status(400).json({ message: "Uçuş kaydedilirken hata oluştu", error });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor`));
