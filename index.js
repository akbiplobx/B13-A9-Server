const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors")
dotenv.config()


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const app = express()
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    
    const db = client.db("pethaven");
    
    
    const petsCollection = db.collection("pets");       
    const petdataCollection = db.collection("petdata"); 
    
   
    app.get('/pets', async (req, res) => {
      try {
        const { search, species, sort } = req.query;
        let query = {};

       
        if (search) {
          query.petName = { $regex: search, $options: 'i' };
        }

       
        if (species && species !== 'All Species') {
          const speciesArray = species.split(',');
          query.species = { $in: speciesArray };
        }

       
        let sortOptions = {};
        if (sort === 'lowToHigh') {
          sortOptions.adoptionFee = 1;  
        } else if (sort === 'highToLow') {
          sortOptions.adoptionFee = -1; 
        }

        
        const result = await petsCollection.find(query).sort(sortOptions).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: "Error fetching pets", error: error.message });
      }
    });

   
    app.get('/my-listings', async(req, res)=>{
      try {
        const result = await petdataCollection.find().toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: "Error fetching listings", error: error.message });
      }
    });

    app.post('/petdata', async (req, res)=>{
      try {
        const petdata = req.body;
        console.log("Adding new pet to user listings:", petdata);
        const result = await petdataCollection.insertOne(petdata);
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: "Error inserting pet data", error: error.message });
      }
    });

    app.get('/pet/:id', async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid ID format" });
        }

        const query = { _id: new ObjectId(id) };

        
        let pet = await petsCollection.findOne(query);

        if (!pet) {
          pet = await petdataCollection.findOne(query);
        }

        if (!pet) {
          return res.status(404).json({ message: "Pet not found" });
        }

        res.json(pet);
      } catch (error) {
        res.status(500).json({ message: "Error fetching pet details", error: error.message });
      }
    });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Database error:", error);
  }
}
run().catch(console.dir);

app.get('/', (req, res)=>{
    res.send('PetNest Server is running smoothly!')
});

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
});

// =========================
    const petdataCollection = client.db("pethaven").collection("petdata")

    app.put('/pet/:id', async (req, res) => {
      try {
        const id = req.params.id;
        
        
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid ID format" });
        }

        const query = { _id: new ObjectId(id) };
        const body = req.body;

        
        console.log("Updating pet id:", id, "with data:", body);
     
        
        const updateDoc = {
          $set: {
            petName: body.petName || body.title || "",
            species: body.species || "",
            breed: body.breed || "",
            age: body.age || "",
            location: body.location || "",
            adoptionFee: body.adoptionFee ? Number(body.adoptionFee) : 0, 
            description: body.description || "",
            imageUrl: body.imageUrl || body.image || "", 
            status: body.status || "available"
          }
        };

        
        let result = await petdataCollection.updateOne(query, updateDoc);

       
        if (result.matchedCount === 0) {
          result = await petsCollection.updateOne(query, updateDoc);
        }

        console.log("Database update result:", result);

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Pet not found in any collection to update" });
        }

        res.json({ success: true, message: "Pet updated successfully", result });
      } catch (error) {
        console.error("Backend error updating pet:", error);
        res.status(500).json({ message: "Server error updating pet details", error: error.message });
      }
    });
    // =========================
   
const adoptionRequestsCollection = client.db("pethaven").collection("adoptionRequests");


app.post('/adoption-requests', async (req, res) => {
  try {
    const requestData = req.body;
    
   
    const result = await adoptionRequestsCollection.insertOne({
      petName: requestData.petName,
      buyerName: requestData.buyerName,
      buyerEmail: requestData.buyerEmail,
      requestDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), // e.g., May 23, 2026
      pickupDate: requestData.pickupDate ? new Date(requestData.pickupDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A",
      status: "Pending", 
      message: requestData.message || ""
    });

    res.status(201).json({ success: true, message: "Request submitted successfully!", result });
  } catch (error) {
    console.error("Error saving request:", error);
    res.status(500).json({ success: false, message: "Server error saving request" });
  }
});

app.get('/my-requests', async (req, res) => {
  try {
    const email = req.query.email;
    let query = {};
    
    if (email) {
      query = { buyerEmail: email };
    }

    const result = await adoptionRequestsCollection.find(query).toArray();
    res.json(result);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Server error fetching requests" });
  }
});