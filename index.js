const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const app = express();
require('dotenv').config();
const port = process.env.port || 5000

// middleware
app.use(cors());
app.use(express.json());



const uri = "mongodb://localhost:27017"
const client = new MongoClient(uri);


// load all appointments data
const DBConnect = async () => {
    try {
        client.connect();
        console.log("success connection");
    } catch (error) {
        console.log(error.message);
    }
}

DBConnect();

// collections

const appointmentsCollection = client.db('doctorsPortal').collection('appointmentData')
const bookingsCollection = client.db("doctorsPortal").collection('bookingsData');



// naming convention
/*
    * app.get('/bookings)
    * app.get('/bookings/:id)
    * app.post('/bookings)
    * app.patch('/bookings/:id)
    * app.delete('/bookings/:id)

*/



app.get("/appointmentOptions", async (req, res) => {
    try {
        const { date } = req.query;
        console.log(date);
        const query = {};
        const appointmentsData = await appointmentsCollection.find(query).toArray();
        // get bookings of provided date
        const bookingQuery = { selectedDate: date };
        const booked = await bookingsCollection.find(bookingQuery).toArray();

        appointmentsData.forEach(appOption => {
            const optionBooked = booked.filter(bookedOption => bookedOption.treatmentName === appOption.name)
            console.log(optionBooked);
            const bookedSlots = optionBooked.map(bookedSlot => bookedSlot.slot);
            const remainingSlots = appOption.slots.filter(slot => !bookedSlots.includes(slot));
            appOption.slots = remainingSlots;
            console.log(date, appOption.name, remainingSlots.length);
        })
        res.send(appointmentsData)


    } catch (error) {
        console.log(error);
    }
})

// add bookings to db
app.post('/bookings', async (req, res) => {
    const bookingInfo = req.body;
    const query = {
        selectedDate: bookingInfo.selectedDate,
        treatmentName: bookingInfo.treatmentName,
        email: bookingInfo.email
    }
    const alreadyBooked = await bookingsCollection.find(query).toArray();
    if (alreadyBooked.length) {
        const message = `You already have booking on ${bookingInfo.selectedDate} `
        return res.send({ acknowledged: false, message })
    }
    const result = await bookingsCollection.insertOne(bookingInfo);
    res.send(result)
})



















app.get("/", (req, res) => {
    res.send({
        success: true,
        message: "portal server is running.."
    })
})



app.listen(port, () => {
    console.log("server is running in ", port || 5000);
})