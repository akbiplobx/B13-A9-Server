const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require('express')
const dotenv = require('dotenv')
const cors = require("cors")
dotenv.config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGODB_URI;
const app = express()
const PORT = process.env.PORT 
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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("pethaven");
    const petdataCollection = db.collection("petdata");
    
    app.post('/petdata', async (req, res)=>{
      const petdata = req.body
      console.log(petdata)
      const result = await petdataCollection.insertOne(petdata)
      console.log(result)
      res.json(result)
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// app.get('/', (req, res)=>{
//     res.send('Hello World!')
// }
// )
app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`)
})
