const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
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
const usersCollection = client.db('doctorsPortal').collection('usres')


// naming convention
/*
    * app.get('/bookings)
    * app.get('/bookings/:id)
    * app.post('/bookings)
    * app.patch('/bookings/:id)
    * app.delete('/bookings/:id)

*/

// verify jwt
const verifyJWT = (req, res, next) => {
    console.log("token", req.headers.authorization);
    const authheader = req.headers.authorization;
    if (!authheader) {
        return res.status(401).send('unauthorised access')
    }
    const token = authheader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({
                message: "unauthorised access",

            })
        }
        req.decoded = decoded;
        next();
    })
}



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
// app.

// email based appointments booked
app.get("/bookings", verifyJWT, async (req, res) => {
    const { email } = req.query;
    const decodedEmail = req.decoded.email;
    console.log(decodedEmail);
    if (email !== decodedEmail) {
        return res.status(403).send({
            message: `forbidden access`
        })
    }
    console.log(req.headers.authorization);
    const query = { email: email };
    const appointments = await bookingsCollection.find(query).toArray();
    res.send(appointments)
})

// get all users
app.get("/users", async (req, res) => {

    const result = await usersCollection.find({}).toArray();
    res.send(result);
})


// add bookings to db
app.post('/bookings', async (req, res) => {
    try {
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
    } catch (error) {
        console.log(error.message);
    }
})


// add users to db
app.post('/users', async (req, res) => {
    try {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.send(result);
    } catch (error) {
        console.log(error);
    }
})

app.get('/jwt', async (req, res) => {
    try {
        const { email } = req.query;
        const query = {
            email: email
        }
        const result = await usersCollection.findOne(query);
        console.log(result);
        if (result) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
            return res.send({
                token: token
            })
        }
        else {
            return res.status(401).send({
                token: ""
            })
        }

    }
    catch (error) {
        console.log(error.message);
    }
})




// make admin role by patch

app.put("/users/admin/:id", async (req, res) => {

    const { id } = req.params;
    const filter = { _id: ObjectId(id) }
    const options = { upsert: true }
    const updatedDoc = {
        $set: {
            role: "admin"
        }
    }

    const result = await usersCollection.updateOne(filter, updatedDoc, options);
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