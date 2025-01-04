const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();

const uri = 'mongodb://localhost:27017';
const dbName = 'userAuth';
const client = new MongoClient(uri);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
function parseCookies(req) {
  const cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      cookies[key] = value;
    });
  }
  return cookies;
}

async function connectToDb() {
  if (!client.isConnected) {
    await client.connect();
  }
  return client.db(dbName);
}
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});
app.post('/signupapi', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const db = await connectToDb();
    const usersCollection = db.collection('users');
    const cartCollection = db.collection('cart');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const result = await usersCollection.insertOne({
       "name":name,
       "email":email,
        "password":password 
    });
    const cartesult = await cartCollection.insertOne({
      "userEmail": email,
      "cart":[]
    });

    res.status(200).json({ message: 'User created successfully', userId: result.insertedId });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/loginapi', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const db = await connectToDb();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.password === password) {
      res.setHeader('Set-Cookie', `sessionId=${user._id.toString()}; HttpOnly; Max-Age=3600`);
      res.status(200).json({
        message: 'Authentication successful',
        success: true,
        userId: email
      });
    } else {
      res.status(400).json({ message: 'Incorrect password', success: false });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/dashboard', (req, res) => {
  const cookies = parseCookies(req);
  const sessionId = cookies['sessionId'];

  if (!sessionId) {
    res.sendFile(path.join(__dirname, 'login.html'));
  }

  const protectedHtmlPath = path.join(__dirname, 'index.html');
  res.sendFile(protectedHtmlPath);
});

app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Max-Age=0');
  res.status(200).json({ states: true});
});
app.get('/login',(req,res)=>{
res.sendFile(path.join(__dirname, 'login.html'))
})
app.get('/sigin',(req,res)=>{
res.sendFile(path.join(__dirname, 'sigin.html'))
})

app.post('/update-cart',async(req,res)=>{
  const {cart,userId} = req.body
  const db = await connectToDb();
  const cartCollection = db.collection('cart');
  const result = await  cartCollection.updateOne( { userEmail: "vijayaragavanm3@gmail.com" },  { $set: { cart:[]}})
  cartCollection.updateOne(
    { userEmail: userId }, 
    {
      $push: {
        cart: {
          $each: cart
        }
      }
    }
  )
  

})

app.post('/cart',async(req,res)=>{
  const db = await connectToDb();
  const cartCollection = db.collection('cart');
  const {email} = req.body
  const result = await cartCollection.findOne({userEmail:email})
  res.json({data:result.cart})
})


app.post('/orders',async(req,res)=>{
  const {email,orders,orderAmount} = req.body
  const db = await connectToDb();
  const ordersCollection = db.collection('orders');
  const result = await ordersCollection.insertOne({userEmail:email,orders:orders,amount:orderAmount})
  if(result){
    res.json({resststes:true})
  }else{
    res.json({resststes:false})
  }
})
const port = 5000;
app.listen(port,async() => {
  console.log(`Server running on http://localhost:${port}`);
});
