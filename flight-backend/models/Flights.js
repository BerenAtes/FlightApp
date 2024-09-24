const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema({
  flightNumber: String,
  airline: String,
  departureTime: Date,
  arrivalTime: Date,
  origin: String,
  destination: String,
  status: String,
});

const Flight = mongoose.model("Flight", flightSchema);

module.exports = Flight;
