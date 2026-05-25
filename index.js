const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express');
const dotenv = require('dotenv');
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
    const adoptionRequestsCollection = db.collection("adoptionRequests");

    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // ==========================================
    // 🐾 PETS & LISTINGS API ROUTES
    // ==========================================

    // All Pets Fetch (with Search, Filter, Sort)
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

    // Get My Listings
    app.get('/my-listings', async(req, res)=>{
      try {
        const result = await petdataCollection.find().toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: "Error fetching listings", error: error.message });
      }
    });

    // Add New Pet Data
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

    // Get Single Pet Details (Checks both collections)
    app.get('/pet/:id',(req, res, next)=>{
const header = req.headers.authorization
console.log(header)
next()
    }, async (req, res) => {
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

    // Update Pet Data
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

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Pet not found in any collection to update" });
        }

        res.json({ success: true, message: "Pet updated successfully", result });
      } catch (error) {
        console.error("Backend error updating pet:", error);
        res.status(500).json({ message: "Server error updating pet details", error: error.message });
      }
    });

    // Delete Pet Data
    app.delete('/pet/:id', async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid ID format" });
        }

        const query = { _id: new ObjectId(id) };
        let result = await petdataCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          result = await petsCollection.deleteOne(query);
        }

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Pet not found in any collection to delete" });
        }

        res.json({ success: true, message: "Pet deleted successfully", result });
      } catch (error) {
        console.error("Backend error deleting pet:", error);
        res.status(500).json({ message: "Server error deleting pet", error: error.message });
      }
    });

    // ==========================================
    // 💌 ADOPTION REQUESTS API ROUTES
    // ==========================================

    // Submit Adoption Request
    app.post('/adoption-requests', async (req, res) => {
      try {
        const requestData = req.body;
        const result = await adoptionRequestsCollection.insertOne({
          petId: requestData.petId, // মডাল ফিল্টারিং সহজ করার জন্য আইডিটি রাখা ভালো
          petName: requestData.petName,
          buyerName: requestData.buyerName,
          buyerEmail: requestData.buyerEmail,
          requestDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 
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

    // Get Requests (Supports both Pet Specific and User Specific queries)
    app.get('/my-requests', async (req, res) => {
      try {
        const { email, petId } = req.query;
        let query = {};
        
        if (email) {
          query.buyerEmail = email;
        }
        if (petId) {
          query.petId = petId; 
        }

        const result = await adoptionRequestsCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ message: "Server error fetching requests" });
      }
    });

    
    app.patch('/change-status/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body; 

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ message: "Invalid ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: { status: status },
        };

        const result = await adoptionRequestsCollection.updateOne(filter, updateDoc);
        
        if (result.modifiedCount > 0 || result.matchedCount > 0) {
          res.json({ success: true, message: "Status updated successfully!" });
        } else {
          res.status(404).json({ success: false, message: "Request not found" });
        }
      } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ success: false, message: "Server error updating status" });
      }
    });

  } catch (error) {
    console.error("Database error:", error);
  }
}

run().catch(console.dir);

// Base Route
app.get('/', (req, res)=>{
    res.send('PetNest Server is running smoothly!')
});

// Server Listener
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
});