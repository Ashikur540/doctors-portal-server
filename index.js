

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
const doctorsCollection = client.db('doctorsPortal').collection('doctors')


// naming convention
/*
    * app.get('/bookings)
    * app.get('/bookings/:id)
    * app.post('/bookings)
    * app.patch('/bookings/:id)
    * app.delete('/bookings/:id)

*/
/* ################MY MiddleWares  ########################*/
// verify jwt
const verifyJWT = (req, res, next) => {
    // console.log("token", req.headers.authorization);
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

        // request object e ekta property add korlam and value set korlam
        req.decoded = decoded;
        next();
    })
}


// make sure to verify Admin after jwt verification
// we are writing this middleware to check if the requested user is really an admin or not
const verifyAdmin = async (req, res, next) => {
    // console.log("inside verify admin++++", req.decoded?.email);
    const decodedEmail = req.decoded?.email;
    const query = { email: decodedEmail };
    const user = await usersCollection.findOne(query);

    if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next();
}


/* ################MY MiddleWares ENDS  ########################*/




/* ################MY get Operations starts  ########################*/

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
    // console.log(decodedEmail);
    if (email !== decodedEmail) {
        return res.status(403).send({
            message: `forbidden access`
        })
    }
    // console.log(req.headers.authorization);
    const query = { email: email };
    const appointments = await bookingsCollection.find(query).toArray();
    res.send(appointments)
})

// get all users
app.get("/users", async (req, res) => {

    const result = await usersCollection.find({}).toArray();
    res.send(result);
})


// jwt implementation 
app.get('/jwt', async (req, res) => {
    try {
        const { email } = req.query;
        const query = {
            email: email
        }
        const result = await usersCollection.findOne(query);
        // console.log(result);
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

// check an admin is actually an admin or not

app.get('/users/admin/:email', async (req, res) => {
    const { email } = req.params;
    // console.log(email)
    const user = await usersCollection.findOne({ email: email });
    // console.log(user);
    console.log(user?.role === 'admin')
    res.send({
        isAdmin: user?.role === 'admin'
    })
})




//filer a field from the schema

app.get('/appointmentSpeciality', async (req, res) => {
    const query = {};
    const result = await appointmentsCollection.find(query).project({
        name: 1
    }).toArray();
    res.send(result)
})

// get all doctors
app.get('/doctors', verifyJWT, verifyAdmin, async (req, res) => {

    // console.log("inside api", req.decoded.email)
    const result = await doctorsCollection.find({}).toArray();
    res.send(result)
})


/* ################MY get Operations ends  ########################*/

/* 
\
\
\
\
\
\
\

*/

/* ################MY post Operations starts  ########################*/

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


// add doctors to db
app.post("/doctors", verifyJWT, verifyAdmin, async (req, res) => {
    const doctorData = req.body;
    const result = await doctorsCollection.insertOne(doctorData);
    res.send(result);
})

/* ################MY post Operations ends  ########################*/

/* 
\
\
\
\
\
\
\

*/

/* ################MY put Operations starts  ########################*/

// make admin role by put

app.put("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {




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


/* ################MY put Operations ends  ########################*/

/* 
\
\
\
\
\
\
\

*/

/* ################MY delete Operations starts  ########################*/
// delete doctor
app.delete('/doctors/:id', verifyJWT, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(id);
    const result = await doctorsCollection.deleteOne({ _id: ObjectId(id) });
    res.send(result)
})

/* ################MY delete Operations ends  ########################*/

/* 
\
\
\
\
\
\
\

*/

/* ################MY patch Operations starts  ########################*/





app.get("/", (req, res) => {
    res.send({
        success: true,
        message: "portal server is running.."
    })
})



app.listen(port, () => {
    console.log("server is running in ", port || 5000);
})